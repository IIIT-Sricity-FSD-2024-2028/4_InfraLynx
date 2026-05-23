import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateQcReviewDto, UpdateQcReviewDto } from './qc-reviews.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class QcReviewsService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly workOrdersService: WorkOrdersService,
    private readonly requestsService: RequestsService,
  ) {}

  private async syncLifecycleForQcStatus(workOrderId: string, qcStatus: string) {
    if (!workOrderId || !qcStatus) return;
    const workOrder = await this.workOrdersService.findOne(workOrderId);
    if (!['PENDING_QC', 'COMPLETED', 'IN_PROGRESS'].includes(workOrder.status)) {
      throw new BadRequestException(`QC review can only be recorded when work order is IN_PROGRESS, PENDING_QC, or COMPLETED. Current status: "${workOrder.status}".`);
    }
    if (qcStatus === 'UNDER_REVIEW') {
      if (workOrder.status === 'IN_PROGRESS') await this.workOrdersService.update(workOrderId, { status: 'PENDING_QC' });
      return;
    }
    if (qcStatus === 'APPROVED') {
      if (!['PENDING_QC', 'COMPLETED'].includes(workOrder.status)) throw new BadRequestException('Work order must be in PENDING_QC before QC approval.');
      const updatedWorkOrder = await this.workOrdersService.update(workOrderId, { status: 'COMPLETED' });
      if (updatedWorkOrder.requestId) await this.requestsService.closeAfterQcCertification(updatedWorkOrder.requestId);
      return;
    }
    if (qcStatus === 'REJECTED') {
      if (workOrder.status === 'COMPLETED') throw new BadRequestException('Completed work orders cannot be moved back to rejected QC state.');
      await this.workOrdersService.update(workOrderId, { status: 'IN_PROGRESS' });
    }
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM qc_reviews ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByWorkOrder(woId: string) {
    const { rows } = await this.db.query('SELECT * FROM qc_reviews WHERE work_order_id = $1 ORDER BY created_at DESC', [woId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM qc_reviews WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`QC review "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateQcReviewDto) {
    const id = `qc-${Date.now()}`;
    const certNote = dto.status === 'APPROVED' ? 'QC certification recorded in the review flow.' : null;
    const { rows } = await this.db.query(
      `INSERT INTO qc_reviews (id, department_id, work_order_id, title, reviewer, finding, status, score, certification_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, dto.departmentId, dto.workOrderId, dto.title, dto.reviewer || null, dto.finding || null, dto.status || 'UNDER_REVIEW', dto.score || null, certNote],
    );
    await this.syncLifecycleForQcStatus(dto.workOrderId, dto.status);
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateQcReviewDto) {
    const current = await this.findOne(id);
    const certNote = dto.status === 'APPROVED' ? 'QC certification recorded in the review flow.' : current.certificationNote;
    const reviewedAt = dto.status ? new Date().toISOString() : current.reviewedAt;
    const { rows } = await this.db.query(
      `UPDATE qc_reviews SET status=$1, finding=$2, score=$3, certification_note=$4, reviewed_at=$5 WHERE id=$6 RETURNING *`,
      [dto.status ?? current.status, dto.finding ?? current.finding, dto.score ?? current.score, certNote, reviewedAt, id],
    );
    await this.syncLifecycleForQcStatus(current.workOrderId, rows[0].status);
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM qc_reviews WHERE id = $1', [id]);
    return { message: `QC review "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      workOrderId: r.work_order_id,
      title: r.title,
      reviewer: r.reviewer,
      finding: r.finding,
      status: r.status,
      score: r.score,
      certificationNote: r.certification_note,
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
    };
  }
}
