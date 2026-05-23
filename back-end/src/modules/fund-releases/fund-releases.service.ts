import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateFundReleaseDto, UpdateFundReleaseDto } from './fund-releases.dto';
import { BudgetProposalsService } from '../budget-proposals/budget-proposals.service';

@Injectable()
export class FundReleasesService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly budgetProposalsService: BudgetProposalsService,
  ) {}

  private async getReleasedTotalForProposal(proposalId: string, excludingId?: string) {
    const { rows } = await this.db.query(
      `SELECT COALESCE(SUM(amount_cr),0) AS total FROM fund_releases WHERE proposal_id=$1 AND status='RELEASED' AND ($2::text IS NULL OR id<>$2)`,
      [proposalId, excludingId || null],
    );
    return parseFloat(rows[0].total) || 0;
  }

  private async syncProposalReleaseStage(proposalId: string) {
    if (!proposalId) return;
    const proposal = await this.budgetProposalsService.findOne(proposalId);
    const released = await this.getReleasedTotalForProposal(proposalId);
    if (released <= 0) return;
    const nextStage = released >= Number(proposal.amountCr || 0) ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';
    if (proposal.stage !== nextStage) await this.budgetProposalsService.update(proposalId, { stage: nextStage });
  }

  private async ensureReleaseEligibility(dto: { proposalId?: string; amountCr?: number; status?: string }) {
    if (!dto.proposalId) return;
    const proposal = await this.budgetProposalsService.findOne(dto.proposalId);
    if (dto.status === 'RELEASED' && !['APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED'].includes(proposal.stage)) {
      throw new BadRequestException(`Fund release can be marked RELEASED only after proposal approval. Current proposal stage: "${proposal.stage}".`);
    }
    if (Number(dto.amountCr || 0) <= 0) throw new BadRequestException('Fund release amount must be greater than zero.');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM fund_releases ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByDepartment(deptId: string) {
    const { rows } = await this.db.query('SELECT * FROM fund_releases WHERE department_id = $1 ORDER BY created_at DESC', [deptId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM fund_releases WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Fund release "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateFundReleaseDto) {
    const status = dto.status || 'PENDING';
    await this.ensureReleaseEligibility({ ...dto, status });
    const id = `release-${Date.now()}`;
    const releasedAt = status === 'RELEASED' ? new Date().toISOString() : null;
    const { rows } = await this.db.query(
      `INSERT INTO fund_releases (id, department_id, proposal_id, title, amount_cr, quarter, status, released_at, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, dto.departmentId, (dto as any).proposalId || null, dto.title, dto.amountCr, (dto as any).quarter || null, status, releasedAt, dto.notes || null],
    );
    if (status === 'RELEASED') await this.syncProposalReleaseStage((dto as any).proposalId);
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateFundReleaseDto) {
    const current = await this.findOne(id);
    const nextStatus = dto.status || current.status;
    await this.ensureReleaseEligibility({ proposalId: current.proposalId, amountCr: current.amountCr, status: nextStatus });
    const releasedAt = nextStatus === 'RELEASED' ? (dto.releasedAt || current.releasedAt || new Date().toISOString()) : (dto.releasedAt ?? current.releasedAt);
    const cfoNote = dto.status ? `CFO demo action moved this fund release to ${dto.status}.` : current.cfoReleaseNote;
    const { rows } = await this.db.query(
      `UPDATE fund_releases SET status=$1, released_at=$2, cfo_release_note=$3, notes=$4 WHERE id=$5 RETURNING *`,
      [nextStatus, releasedAt, cfoNote, dto.notes ?? current.notes, id],
    );
    if (current.proposalId && nextStatus === 'RELEASED') await this.syncProposalReleaseStage(current.proposalId);
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM fund_releases WHERE id = $1', [id]);
    return { message: `Fund release "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      proposalId: r.proposal_id,
      title: r.title,
      amountCr: parseFloat(r.amount_cr),
      quarter: r.quarter,
      status: r.status,
      releasedAt: r.released_at,
      notes: r.notes,
      cfoReleaseNote: r.cfo_release_note,
      createdAt: r.created_at,
    };
  }
}
