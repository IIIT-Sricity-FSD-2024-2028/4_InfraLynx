import { Injectable, NotFoundException } from '@nestjs/common';
import { progressReports as seed } from '../../data/seed.data';
import { CreateProgressReportDto, UpdateProgressReportDto } from './progress-reports.dto';

@Injectable()
export class ProgressReportsService {
  private store: any[] = seed.map((r) => ({ ...r }));
  findAll() { return this.store; }
  findByEngineer(engId: string) { return this.store.filter((r) => r.engineerId === engId); }
  findByWorkOrder(woId: string) { return this.store.filter((r) => r.workOrderId === woId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Progress report "${id}" not found`);
    return item;
  }
  create(dto: CreateProgressReportDto) {
    const record = { id: `report-${Date.now()}`, submittedAt: new Date().toISOString(), ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateProgressReportDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Progress report "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Progress report "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Progress report "${id}" deleted` };
  }
}
