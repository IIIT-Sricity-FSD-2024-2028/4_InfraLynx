import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { fundReleases as seed } from '../../data/seed.data';
import { CreateFundReleaseDto, UpdateFundReleaseDto } from './fund-releases.dto';
import { BudgetProposalsService } from '../budget-proposals/budget-proposals.service';

@Injectable()
export class FundReleasesService {
  constructor(private readonly budgetProposalsService: BudgetProposalsService) {}

  private store: any[] = seed.map((r) => ({ ...r }));

  private getReleasedTotalForProposal(proposalId: string, excludingId?: string) {
    return this.store
      .filter((release) => release.proposalId === proposalId && release.status === 'RELEASED' && release.id !== excludingId)
      .reduce((sum, release) => sum + Number(release.amountCr || 0), 0);
  }

  private syncProposalReleaseStage(proposalId: string) {
    if (!proposalId) return;
    const proposal = this.budgetProposalsService.findOne(proposalId);
    const released = this.getReleasedTotalForProposal(proposalId);
    if (released <= 0) return;

    const nextStage = released >= Number(proposal.amountCr || 0) ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';
    if (proposal.stage !== nextStage) {
      this.budgetProposalsService.update(proposalId, { stage: nextStage });
    }
  }

  private ensureReleaseEligibility(dto: { proposalId?: string; amountCr?: number; status?: string }) {
    if (!dto.proposalId) return;
    const proposal = this.budgetProposalsService.findOne(dto.proposalId);

    if (dto.status === 'RELEASED' && !['APPROVED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED'].includes(proposal.stage)) {
      throw new BadRequestException(
        `Fund release can be marked RELEASED only after proposal approval. Current proposal stage: "${proposal.stage}".`,
      );
    }

    if (Number(dto.amountCr || 0) <= 0) {
      throw new BadRequestException('Fund release amount must be greater than zero.');
    }
  }

  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((r) => r.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Fund release "${id}" not found`);
    return item;
  }
  create(dto: CreateFundReleaseDto) {
    const status = dto.status || 'PENDING';
    this.ensureReleaseEligibility({ ...dto, status });
    const record = {
      id: `release-${Date.now()}`,
      status,
      releasedAt: status === 'RELEASED' ? new Date().toISOString() : null,
      ...dto,
    };
    this.store.unshift(record);
    if (record.status === 'RELEASED') {
      this.syncProposalReleaseStage(record.proposalId);
    }
    return record;
  }
  update(id: string, dto: UpdateFundReleaseDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Fund release "${id}" not found`);
    const current = this.store[idx];
    const nextStatus = dto.status || current.status;
    this.ensureReleaseEligibility({ proposalId: current.proposalId, amountCr: current.amountCr, status: nextStatus });
    this.store[idx] = {
      ...current,
      ...dto,
      releasedAt:
        nextStatus === 'RELEASED'
          ? dto.releasedAt || current.releasedAt || new Date().toISOString()
          : dto.releasedAt ?? current.releasedAt,
      cfoReleaseNote: dto.status
        ? `CFO demo action moved this fund release to ${dto.status}.`
        : current.cfoReleaseNote,
    };
    if (current.proposalId && nextStatus === 'RELEASED') {
      this.syncProposalReleaseStage(current.proposalId);
    }
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Fund release "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Fund release "${id}" deleted` };
  }
}
