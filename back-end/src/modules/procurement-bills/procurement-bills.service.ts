import { Injectable, NotFoundException } from '@nestjs/common';
import { procurementBills as seed } from '../../data/seed.data';
import { CreateProcurementBillDto, UpdateProcurementBillDto } from './procurement-bills.dto';

@Injectable()
export class ProcurementBillsService {
  private store = seed.map((b) => ({ ...b }));
  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((b) => b.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((b) => b.id === id);
    if (!item) throw new NotFoundException(`Procurement bill "${id}" not found`);
    return item;
  }
  create(dto: CreateProcurementBillDto) {
    const record = { id: `bill-${Date.now()}`, status: dto.status || 'UNDER_VERIFICATION', ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateProcurementBillDto) {
    const idx = this.store.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundException(`Procurement bill "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundException(`Procurement bill "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Procurement bill "${id}" deleted` };
  }
}
