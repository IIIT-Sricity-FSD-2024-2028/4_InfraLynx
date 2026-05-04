import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { qcReviews as seed } from '../../data/seed.data';
import { CreateQcReviewDto, UpdateQcReviewDto } from './qc-reviews.dto';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class QcReviewsService {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly requestsService: RequestsService,
  ) {}

  private store: any[] = seed.map((r) => ({ ...r }));

  private syncLifecycleForQcStatus(workOrderId: string, qcStatus: string) {
    if (!workOrderId || !qcStatus) {
      return;
    }

    const workOrder = this.workOrdersService.findOne(workOrderId);

    if (!['PENDING_QC', 'COMPLETED', 'IN_PROGRESS'].includes(workOrder.status)) {
      throw new BadRequestException(
        `QC review can only be recorded when work order is IN_PROGRESS, PENDING_QC, or COMPLETED. Current status: "${workOrder.status}".`,
      );
    }

    if (qcStatus === 'UNDER_REVIEW') {
      if (workOrder.status === 'IN_PROGRESS') {
        this.workOrdersService.update(workOrderId, { status: 'PENDING_QC' });
      }
      return;
    }

    if (qcStatus === 'APPROVED') {
      if (!['PENDING_QC', 'COMPLETED'].includes(workOrder.status)) {
        throw new BadRequestException('Work order must be in PENDING_QC before QC approval.');
      }
      const updatedWorkOrder = this.workOrdersService.update(workOrderId, { status: 'COMPLETED' });
      if (updatedWorkOrder.requestId) {
        this.requestsService.closeAfterQcCertification(updatedWorkOrder.requestId);
      }
      return;
    }

    if (qcStatus === 'REJECTED') {
      if (workOrder.status === 'COMPLETED') {
        throw new BadRequestException('Completed work orders cannot be moved back to rejected QC state.');
      }
      this.workOrdersService.update(workOrderId, { status: 'IN_PROGRESS' });
    }
  }

  findAll() { return this.store; }
  findByWorkOrder(woId: string) { return this.store.filter((r) => r.workOrderId === woId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`QC review "${id}" not found`);
    return item;
  }
  create(dto: CreateQcReviewDto) {
    const record = {
      id: `qc-${Date.now()}`,
      ...dto,
      certificationNote:
        dto.status === 'APPROVED'
          ? 'QC certification recorded in the in-memory review flow.'
          : undefined,
    };
    this.store.unshift(record);
    this.syncLifecycleForQcStatus(record.workOrderId, record.status);
    return record;
  }
  update(id: string, dto: UpdateQcReviewDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`QC review "${id}" not found`);
    this.store[idx] = {
      ...this.store[idx],
      ...dto,
      certificationNote:
        dto.status === 'APPROVED'
          ? 'QC certification recorded in the in-memory review flow.'
          : this.store[idx].certificationNote,
      reviewedAt: dto.status ? new Date().toISOString() : this.store[idx].reviewedAt,
    };
    this.syncLifecycleForQcStatus(this.store[idx].workOrderId, this.store[idx].status);
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`QC review "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `QC review "${id}" deleted` };
  }
}
