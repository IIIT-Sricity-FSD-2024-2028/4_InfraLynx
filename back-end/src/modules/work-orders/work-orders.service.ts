import { Injectable, NotFoundException } from '@nestjs/common';
import { workOrders as seed } from '../../data/seed.data';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './work-orders.dto';

@Injectable()
export class WorkOrdersService {
  private store: any[] = seed.map((w) => ({ ...w }));

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
    const record = {
      id: `wo-${Date.now()}`,
      referenceNo: `WO-${String(Date.now()).slice(-4)}`,
      approvedBy: null, approvedAt: null, rejectedBy: null, rejectedAt: null,
      ...dto,
    };
    this.store.unshift(record);
    return this.withAssignmentSummary([record])[0];
  }

  update(id: string, dto: UpdateWorkOrderDto) {
    const idx = this.store.findIndex((w) => w.id === id);
    if (idx === -1) throw new NotFoundException(`Work order "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
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
