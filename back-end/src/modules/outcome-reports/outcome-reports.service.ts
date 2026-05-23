import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateOutcomeReportDto, UpdateOutcomeReportDto } from './outcome-reports.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

const OUTCOME_VALUES = ['SUCCESSFUL', 'PARTIALLY_SUCCESSFUL', 'UNSUCCESSFUL', 'PENDING'];

@Injectable()
export class OutcomeReportsService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  private async ensureValidOutcomeReportInput(input: { workOrderId?: string; outcome?: string }) {
    if (!input.outcome) return;
    if (!OUTCOME_VALUES.includes(input.outcome)) throw new BadRequestException(`Unsupported outcome value "${input.outcome}"`);
    if (!input.workOrderId) return;
    const workOrder = await this.workOrdersService.findOne(input.workOrderId);
    if (input.outcome !== 'PENDING' && workOrder.status !== 'COMPLETED') throw new BadRequestException('Final outcome can be recorded only after work order completion and QC certification.');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM outcome_reports ORDER BY submitted_at DESC');
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM outcome_reports WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Outcome report "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateOutcomeReportDto) {
    await this.ensureValidOutcomeReportInput(dto);
    const id = `outcome-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO outcome_reports (id, department_id, work_order_id, prepared_by, title, summary, budget_sanctioned, budget_used, outcome, lessons_learned, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING *`,
      [id, dto.departmentId, dto.workOrderId || null, dto.preparedBy || null, dto.title,
       dto.summary || null, dto.budgetSanctioned || null, dto.budgetUsed || null,
       dto.outcome || 'PENDING', dto.lessonsLearned || null],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateOutcomeReportDto) {
    const current = await this.findOne(id);
    const next = { ...current, ...dto };
    await this.ensureValidOutcomeReportInput(next);
    const { rows } = await this.db.query(
      `UPDATE outcome_reports SET outcome=$1, summary=$2, title=$3, lessons_learned=$4, budget_used=$5 WHERE id=$6 RETURNING *`,
      [dto.outcome ?? current.outcome, dto.summary ?? current.summary, dto.title ?? current.title,
       dto.lessonsLearned ?? current.lessonsLearned, dto.budgetUsed ?? current.budgetUsed, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM outcome_reports WHERE id = $1', [id]);
    return { message: `Outcome report "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      workOrderId: r.work_order_id,
      preparedBy: r.prepared_by,
      title: r.title,
      summary: r.summary,
      budgetSanctioned: r.budget_sanctioned ? parseFloat(r.budget_sanctioned) : null,
      budgetUsed: r.budget_used ? parseFloat(r.budget_used) : null,
      outcome: r.outcome,
      lessonsLearned: r.lessons_learned,
      submittedAt: r.submitted_at,
    };
  }
}
