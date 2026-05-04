import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { budgetProposals as seed } from '../../data/seed.data';
import { CreateBudgetProposalDto, UpdateBudgetProposalDto } from './budget-proposals.dto';

const BUDGET_FLOW = [
  'DRAFT',
  'PENDING_ADMIN_FORWARD',
  'PENDING_OFFICER_VERIFICATION',
  'PENDING_CFO_REVIEW',
  'APPROVED',
  'PARTIALLY_RELEASED',
  'FULLY_RELEASED',
];

@Injectable()
export class BudgetProposalsService {
  private store: any[] = seed.map((p) => ({ ...p }));

  private ensureValidStageTransition(currentStage: string, nextStage: string) {
    if (!nextStage || currentStage === nextStage) return;

    if (nextStage === 'REJECTED') {
      if (currentStage === 'FULLY_RELEASED') {
        throw new BadRequestException('A fully released proposal cannot be rejected.');
      }
      return;
    }

    const currentIndex = BUDGET_FLOW.indexOf(currentStage);
    const nextIndex = BUDGET_FLOW.indexOf(nextStage);

    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid budget stage transition: ${currentStage} -> ${nextStage}`);
    }

    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException(
        'Budget lifecycle must follow: DRAFT -> PENDING_ADMIN_FORWARD -> PENDING_OFFICER_VERIFICATION -> PENDING_CFO_REVIEW -> APPROVED -> PARTIALLY_RELEASED -> FULLY_RELEASED',
      );
    }
  }

  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((p) => p.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((p) => p.id === id);
    if (!item) throw new NotFoundException(`Budget proposal "${id}" not found`);
    return item;
  }
  create(dto: CreateBudgetProposalDto) {
    const stage = dto.stage || 'DRAFT';
    if (![...BUDGET_FLOW, 'REJECTED'].includes(stage)) {
      throw new BadRequestException(`Unsupported budget proposal stage "${stage}"`);
    }
    const record = { id: `proposal-${Date.now()}`, stage, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateBudgetProposalDto) {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException(`Budget proposal "${id}" not found`);
    const current = this.store[idx];
    const nextStage = dto.stage || current.stage;
    this.ensureValidStageTransition(current.stage, nextStage);

    this.store[idx] = {
      ...current,
      ...dto,
      stage: nextStage,
      cfoReviewNote: dto.stage
        ? `CFO demo action moved this budget allocation to ${dto.stage}.`
        : current.cfoReviewNote,
      cfoReviewedAt: dto.stage ? new Date().toISOString() : current.cfoReviewedAt,
    };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException(`Budget proposal "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Budget proposal "${id}" deleted` };
  }
}
