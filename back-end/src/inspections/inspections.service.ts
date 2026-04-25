import { Injectable, NotFoundException } from '@nestjs/common';
import { inspections as seed } from '../data/seed.data';
import { CreateInspectionDto, UpdateInspectionDto } from './inspections.dto';

@Injectable()
export class InspectionsService {
  private store = seed.map((i) => ({ ...i }));
  findAll() { return this.store; }
  findByEngineer(engId: string) { return this.store.filter((i) => i.engineerId === engId); }
  findOne(id: string) {
    const item = this.store.find((i) => i.id === id);
    if (!item) throw new NotFoundException(`Inspection "${id}" not found`);
    return item;
  }
  create(dto: CreateInspectionDto) {
    const record = { id: `inspection-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateInspectionDto) {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException(`Inspection "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new NotFoundException(`Inspection "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Inspection "${id}" deleted` };
  }
}
