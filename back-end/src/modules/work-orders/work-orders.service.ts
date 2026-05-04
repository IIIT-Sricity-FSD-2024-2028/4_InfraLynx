import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { workOrders as seed } from '../../data/seed.data';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './work-orders.dto';
import { RequestsService } from '../requests/requests.service';

const ORDER_FLOW = [
  'DRAFT',
  'PENDING_OFFICER_APPROVAL',
  'PENDING_ADMIN_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_QC',
  'COMPLETED',
];

const TERMINAL_ORDER_STATUSES = ['REJECTED', 'CANCELLED'];

@Injectable()
export class WorkOrdersService {
  constructor(private readonly requestsService: RequestsService) {}

  private store: any[] = seed.map((w) => ({ ...w }));

  private ensureRequestPlanningEligibility(requestId: string, departmentId: string) {
    const request = this.requestsService.findOne(requestId);
    if (request.departmentId !== departmentId) {
      throw new BadRequestException('Work order department must match the linked citizen request department.');
    }

    if (!['APPROVED_FOR_PLANNING', 'CONVERTED_TO_WORK_ORDER'].includes(request.status)) {
      throw new BadRequestException(
        `Linked request must be APPROVED_FOR_PLANNING before conversion. Current status is "${request.status}".`,
      );
    }
  }

  private ensureValidStatusTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;

    if (TERMINAL_ORDER_STATUSES.includes(nextStatus)) {
      if (currentStatus === 'COMPLETED') {
        throw new BadRequestException('Completed work orders cannot be rejected or cancelled.');
      }
      return;
    }

    const currentIndex = ORDER_FLOW.indexOf(currentStatus);
    const nextIndex = ORDER_FLOW.indexOf(nextStatus);

    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid work-order lifecycle transition: ${currentStatus} -> ${nextStatus}`);
    }

    // Keep compatibility with current admin dashboard behavior that may fast-track approval.
    if (currentStatus === 'PENDING_OFFICER_APPROVAL' && nextStatus === 'APPROVED') {
      return;
    }

    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException(
        'Work order lifecycle must follow: DRAFT -> PENDING_OFFICER_APPROVAL -> PENDING_ADMIN_APPROVAL -> APPROVED -> IN_PROGRESS -> PENDING_QC -> COMPLETED',
      );
    }
  }

  findAll() { return this.withAssignmentSummary(this.store); }
  findByDepartment(deptId: string) { return this.withAssignmentSummary(this.store.filter((w) => w.departmentId === deptId)); }
  findByEngineer(engId: string) { return this.withAssignmentSummary(this.store.filter((w) => w.engineerId === engId)); }
  findByRequest(reqId: string) { return this.withAssignmentSummary(this.store.filter((w) => w.requestId === reqId)); }

  findOne(id: string) {
    const item = this.store.find((w) => w.id === id);
    if (!item) throw new NotFoundException(`Work order "${id}" not found`);
    return this.withAssignmentSummary([item])[0];
  }

  create(dto: CreateWorkOrderDto) {
    if (dto.requestId) {
      this.ensureRequestPlanningEligibility(dto.requestId, dto.departmentId);
    }

    const status = dto.status || 'DRAFT';
    if (status === 'COMPLETED') {
      throw new BadRequestException('A work order cannot be created directly in COMPLETED state.');
    }

    if (status === 'IN_PROGRESS' && !dto.engineerId) {
      throw new BadRequestException('Assign an engineer before moving a work order to IN_PROGRESS.');
    }

    const record = {
      id: `wo-${Date.now()}`,
      referenceNo: `WO-${String(Date.now()).slice(-4)}`,
      approvedBy: null, approvedAt: null, rejectedBy: null, rejectedAt: null,
      ...dto,
      status,
    };
    this.store.unshift(record);

    if (dto.requestId) {
      this.requestsService.transitionToWorkOrder(dto.requestId);
    }

    return this.withAssignmentSummary([record])[0];
  }

  update(id: string, dto: UpdateWorkOrderDto) {
    const idx = this.store.findIndex((w) => w.id === id);
    if (idx === -1) throw new NotFoundException(`Work order "${id}" not found`);
    const current = this.store[idx];
    const nextStatus = dto.status || current.status;
    this.ensureValidStatusTransition(current.status, nextStatus);

    const nextEngineerId = dto.engineerId !== undefined ? dto.engineerId : current.engineerId;
    if (nextStatus === 'IN_PROGRESS' && !nextEngineerId) {
      throw new BadRequestException('Assign an engineer before moving a work order to IN_PROGRESS.');
    }

    this.store[idx] = { ...current, ...dto, status: nextStatus };
    return this.withAssignmentSummary([this.store[idx]])[0];
  }

  remove(id: string) {
    const idx = this.store.findIndex((w) => w.id === id);
    if (idx === -1) throw new NotFoundException(`Work order "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Work order "${id}" deleted` };
  }

  private withAssignmentSummary(items: any[]) {
    return items.map((item) => ({
      ...item,
      assignmentModel: item.engineerId ? 'Task-style field assignment' : 'Awaiting task assignment',
      assignmentNote: item.engineerId
        ? 'This in-memory phase stores the assigned engineer on the work order while presenting it as a task-style assignment.'
        : 'Officer planning should assign this work to a field engineer before execution.',
    }));
  }
}
