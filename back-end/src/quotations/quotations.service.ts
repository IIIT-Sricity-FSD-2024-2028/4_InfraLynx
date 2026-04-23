import { Injectable, NotFoundException } from '@nestjs/common';
import { quotations as seed } from '../data/seed.data';
import { CreateQuotationDto, UpdateQuotationDto } from './quotations.dto';

@Injectable()
export class QuotationsService {
  private store = seed.map((q) => ({ ...q }));
  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((q) => q.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((q) => q.id === id);
    if (!item) throw new NotFoundException(`Quotation "${id}" not found`);
    return item;
  }
  create(dto: CreateQuotationDto) {
    const record = { id: `quote-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateQuotationDto) {
    const idx = this.store.findIndex((q) => q.id === id);
    if (idx === -1) throw new NotFoundException(`Quotation "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((q) => q.id === id);
    if (idx === -1) throw new NotFoundException(`Quotation "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Quotation "${id}" deleted` };
  }
}
