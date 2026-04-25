import { Injectable, NotFoundException } from '@nestjs/common';
import { resourceRequests as seed } from '../data/seed.data';
import { CreateResourceRequestDto, UpdateResourceRequestDto } from './resource-requests.dto';

@Injectable()
export class ResourceRequestsService {
  private store = seed.map((r) => ({ ...r }));
  findAll() { return this.store; }
  findByEngineer(engId: string) { return this.store.filter((r) => r.engineerId === engId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Resource request "${id}" not found`);
    return item;
  }
  create(dto: CreateResourceRequestDto) {
    const record = { id: `resource-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateResourceRequestDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Resource request "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Resource request "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Resource request "${id}" deleted` };
  }
}
