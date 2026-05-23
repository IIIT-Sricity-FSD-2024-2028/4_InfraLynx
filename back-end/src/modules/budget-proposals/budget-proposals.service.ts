import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateBudgetProposalDto, UpdateBudgetProposalDto } from './budget-proposals.dto';

const BUDGET_FLOW = ['DRAFT', 'PENDING_ADMIN_FORWARD', 'PENDING_OFFICER_VERIFICATION', 'PENDING_CFO_REVIEW', 'APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED'];

@Injectable()
export class BudgetProposalsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  private ensureValidStageTransition(currentStage: string, nextStage: string) {
    if (!nextStage || currentStage === nextStage) return;
    if (nextStage === 'REJECTED') {
      if (currentStage === 'FULLY_RELEASED') throw new BadRequestException('A fully released proposal cannot be rejected.');
      return;
    }
    const currentIndex = BUDGET_FLOW.indexOf(currentStage);
    const nextIndex = BUDGET_FLOW.indexOf(nextStage);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid budget stage transition: ${currentStage} -> ${nextStage}`);
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Budget lifecycle must follow: DRAFT -> PENDING_ADMIN_FORWARD -> PENDING_OFFICER_VERIFICATION -> PENDING_CFO_REVIEW -> APPROVED -> PARTIALLY_RELEASED -> FULLY_RELEASED');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM budget_proposals ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByDepartment(deptId: string) {
    const { rows } = await this.db.query('SELECT * FROM budget_proposals WHERE department_id = $1 ORDER BY created_at DESC', [deptId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM budget_proposals WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Budget proposal "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateBudgetProposalDto) {
    const stage = dto.stage || 'DRAFT';
    if (![...BUDGET_FLOW, 'REJECTED'].includes(stage)) throw new BadRequestException(`Unsupported budget proposal stage "${stage}"`);
    const id = `proposal-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO budget_proposals (id, department_id, title, amount_cr, stage, justification, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, dto.departmentId, dto.title, dto.amountCr, stage, dto.justification || null, (dto as any).requestedBy || null],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateBudgetProposalDto) {
    const current = await this.findOne(id);
    const nextStage = dto.stage || current.stage;
    this.ensureValidStageTransition(current.stage, nextStage);
    const cfoNote = dto.stage ? `CFO demo action moved this budget allocation to ${dto.stage}.` : current.cfoReviewNote;
    const cfoAt = dto.stage ? new Date().toISOString() : current.cfoReviewedAt;
    const { rows } = await this.db.query(
      `UPDATE budget_proposals SET stage=$1, cfo_review_note=$2, cfo_reviewed_at=$3 WHERE id=$4 RETURNING *`,
      [nextStage, cfoNote, cfoAt, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM budget_proposals WHERE id = $1', [id]);
    return { message: `Budget proposal "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      title: r.title,
      amountCr: parseFloat(r.amount_cr),
      stage: r.stage,
      justification: r.justification,
      requestedBy: r.requested_by,
      cfoReviewNote: r.cfo_review_note,
      cfoReviewedAt: r.cfo_reviewed_at,
      createdAt: r.created_at,
    };
  }
}
