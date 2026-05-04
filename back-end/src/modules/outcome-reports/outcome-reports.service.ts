import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { outcomeReports as seed } from '../../data/seed.data';
import { CreateOutcomeReportDto, UpdateOutcomeReportDto } from './outcome-reports.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

const OUTCOME_VALUES = ['SUCCESSFUL', 'PARTIALLY_SUCCESSFUL', 'UNSUCCESSFUL', 'PENDING'];

@Injectable()
export class OutcomeReportsService {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  private store: any[] = seed.map((r) => ({ ...r }));

  private ensureValidOutcomeReportInput(input: { workOrderId?: string; outcome?: string }) {
    if (!input.outcome) return;
    if (!OUTCOME_VALUES.includes(input.outcome)) {
      throw new BadRequestException(`Unsupported outcome value "${input.outcome}"`);
    }
    if (!input.workOrderId) return;

    const workOrder = this.workOrdersService.findOne(input.workOrderId);
    if (input.outcome !== 'PENDING' && workOrder.status !== 'COMPLETED') {
      throw new BadRequestException('Final outcome can be recorded only after work order completion and QC certification.');
    }
  }

  findAll() { return this.store; }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Outcome report "${id}" not found`);
    return item;
  }
  create(dto: CreateOutcomeReportDto) {
    this.ensureValidOutcomeReportInput(dto);
    const record = { id: `outcome-${Date.now()}`, submittedAt: new Date().toISOString(), ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateOutcomeReportDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Outcome report "${id}" not found`);
    const next = { ...this.store[idx], ...dto };
    this.ensureValidOutcomeReportInput(next);
    this.store[idx] = next;
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Outcome report "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Outcome report "${id}" deleted` };
  }
}
