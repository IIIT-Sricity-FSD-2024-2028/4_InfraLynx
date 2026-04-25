import { Injectable, NotFoundException } from '@nestjs/common';
import { budgetProposals as seed } from '../data/seed.data';
import { CreateBudgetProposalDto, UpdateBudgetProposalDto } from './budget-proposals.dto';

@Injectable()
export class BudgetProposalsService {
  private store = seed.map((p) => ({ ...p }));
  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((p) => p.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((p) => p.id === id);
    if (!item) throw new NotFoundException(`Budget proposal "${id}" not found`);
    return item;
  }
  create(dto: CreateBudgetProposalDto) {
    const record = { id: `proposal-${Date.now()}`, stage: dto.stage || 'PENDING_CFO_REVIEW', ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateBudgetProposalDto) {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException(`Budget proposal "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new NotFoundException(`Budget proposal "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Budget proposal "${id}" deleted` };
  }
}
