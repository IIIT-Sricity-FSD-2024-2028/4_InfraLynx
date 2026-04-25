import { Injectable, NotFoundException } from '@nestjs/common';
import { outcomeReports as seed } from '../../data/seed.data';
import { CreateOutcomeReportDto, UpdateOutcomeReportDto } from './outcome-reports.dto';

@Injectable()
export class OutcomeReportsService {
  private store: any[] = seed.map((r) => ({ ...r }));
  findAll() { return this.store; }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Outcome report "${id}" not found`);
    return item;
  }
  create(dto: CreateOutcomeReportDto) {
    const record = { id: `outcome-${Date.now()}`, submittedAt: new Date().toISOString(), ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateOutcomeReportDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Outcome report "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Outcome report "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Outcome report "${id}" deleted` };
  }
}
