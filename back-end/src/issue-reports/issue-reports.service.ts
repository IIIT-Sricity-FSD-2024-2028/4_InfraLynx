import { Injectable, NotFoundException } from '@nestjs/common';
import { issueReports as seed } from '../data/seed.data';
import { CreateIssueReportDto, UpdateIssueReportDto } from './issue-reports.dto';

@Injectable()
export class IssueReportsService {
  private store = seed.map((i) => ({ ...i }));
  findAll() { return this.store; }
  findByEngineer(engId: string) { return this.store.filter((i) => i.engineerId === engId); }
  findOne(id: string) {
    const item = this.store.find((i) => i.id === id);
    if (!item) throw new NotFoundException(`Issue report "${id}" not found`);
    return item;
  }
  create(dto: CreateIssueReportDto) {
    const record = { id: `issue-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateIssueReportDto) {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException(`Issue report "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException(`Issue report "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Issue report "${id}" deleted` };
  }
}
