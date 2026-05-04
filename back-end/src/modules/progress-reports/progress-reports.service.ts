import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { progressReports as seed } from '../../data/seed.data';
import { CreateProgressReportDto, UpdateProgressReportDto } from './progress-reports.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';

const REPORT_FLOW = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'];

@Injectable()
export class ProgressReportsService {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  private store: any[] = seed.map((r) => ({ ...r }));

  private ensureReportTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    const currentIndex = REPORT_FLOW.indexOf(currentStatus);
    const nextIndex = REPORT_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid progress report transition: ${currentStatus} -> ${nextStatus}`);
    }
    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException('Progress report lifecycle must follow: DRAFT -> SUBMITTED -> ACKNOWLEDGED');
    }
  }

  private syncLinkedWorkOrder(report: { workOrderId?: string; status?: string; engineerId?: string }) {
    if (!report.workOrderId) return;

    const workOrder = this.workOrdersService.findOne(report.workOrderId);
    if (report.engineerId && workOrder.engineerId && workOrder.engineerId !== report.engineerId) {
      throw new BadRequestException('Progress report engineer must match the assigned work order engineer.');
    }

    if (report.status === 'SUBMITTED' && workOrder.status === 'APPROVED') {
      this.workOrdersService.update(workOrder.id, { status: 'IN_PROGRESS' });
    }
  }

  findAll() { return this.store; }
  findByEngineer(engId: string) { return this.store.filter((r) => r.engineerId === engId); }
  findByWorkOrder(woId: string) { return this.store.filter((r) => r.workOrderId === woId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Progress report "${id}" not found`);
    return item;
  }
  create(dto: CreateProgressReportDto) {
    const status = dto.status || 'DRAFT';
    if (!REPORT_FLOW.includes(status)) {
      throw new BadRequestException(`Unsupported progress report status "${status}"`);
    }
    const record = { id: `report-${Date.now()}`, submittedAt: new Date().toISOString(), ...dto, status };
    this.syncLinkedWorkOrder(record);
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateProgressReportDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Progress report "${id}" not found`);
    const current = this.store[idx];
    const nextStatus = dto.status || current.status;
    this.ensureReportTransition(current.status, nextStatus);

    this.store[idx] = { ...current, ...dto, status: nextStatus };
    this.syncLinkedWorkOrder(this.store[idx]);
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Progress report "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Progress report "${id}" deleted` };
  }
}
