import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateProgressReportDto, UpdateProgressReportDto } from './progress-reports.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

const REPORT_FLOW = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'];

@Injectable()
export class ProgressReportsService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  private ensureReportTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    const currentIndex = REPORT_FLOW.indexOf(currentStatus);
    const nextIndex = REPORT_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid progress report transition: ${currentStatus} -> ${nextStatus}`);
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Progress report lifecycle must follow: DRAFT -> SUBMITTED -> ACKNOWLEDGED');
  }

  private async syncLinkedWorkOrder(report: { workOrderId?: string; status?: string; engineerId?: string }) {
    if (!report.workOrderId) return;
    const workOrder = await this.workOrdersService.findOne(report.workOrderId);
    if (report.engineerId && workOrder.engineerId && workOrder.engineerId !== report.engineerId) throw new BadRequestException('Progress report engineer must match the assigned work order engineer.');
    if (report.status === 'SUBMITTED' && workOrder.status === 'APPROVED') await this.workOrdersService.update(workOrder.id, { status: 'IN_PROGRESS' });
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM progress_reports ORDER BY submitted_at DESC');
    return rows.map(this.mapRow);
  }

  async findByEngineer(engId: string) {
    const { rows } = await this.db.query('SELECT * FROM progress_reports WHERE engineer_id = $1 ORDER BY submitted_at DESC', [engId]);
    return rows.map(this.mapRow);
  }

  async findByWorkOrder(woId: string) {
    const { rows } = await this.db.query('SELECT * FROM progress_reports WHERE work_order_id = $1 ORDER BY submitted_at DESC', [woId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM progress_reports WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Progress report "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateProgressReportDto) {
    const status = dto.status || 'DRAFT';
    if (!REPORT_FLOW.includes(status)) throw new BadRequestException(`Unsupported progress report status "${status}"`);
    const id = `report-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO progress_reports (id, department_id, engineer_id, work_order_id, title, summary, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.workOrderId || null, dto.title, dto.summary || null, status],
    );
    await this.syncLinkedWorkOrder({ workOrderId: dto.workOrderId, status, engineerId: dto.engineerId });
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateProgressReportDto) {
    const current = await this.findOne(id);
    const nextStatus = dto.status || current.status;
    this.ensureReportTransition(current.status, nextStatus);
    const { rows } = await this.db.query(
      `UPDATE progress_reports SET status=$1, summary=$2, title=$3 WHERE id=$4 RETURNING *`,
      [nextStatus, dto.summary ?? current.summary, dto.title ?? current.title, id],
    );
    await this.syncLinkedWorkOrder({ workOrderId: current.workOrderId, status: nextStatus, engineerId: current.engineerId });
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM progress_reports WHERE id = $1', [id]);
    return { message: `Progress report "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      workOrderId: r.work_order_id,
      title: r.title,
      summary: r.summary,
      status: r.status,
      submittedAt: r.submitted_at,
    };
  }
}
