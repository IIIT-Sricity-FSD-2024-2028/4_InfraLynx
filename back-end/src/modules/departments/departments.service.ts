import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { departments as seed } from '../../data/seed.data';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Injectable()
export class DepartmentsService {
  private store = seed.map((d) => ({ ...d }));

  findAll() { return this.store; }

  findOne(id: string) {
    const item = this.store.find((d) => d.id === id);
    if (!item) throw new NotFoundException(`Department "${id}" not found`);
    return item;
  }

  create(dto: CreateDepartmentDto) {
    const dup = this.store.find((d) => d.name.toLowerCase() === dto.name.toLowerCase());
    if (dup) throw new ConflictException('A department with this name already exists');
    const record = { id: `dept-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }

  update(id: string, dto: UpdateDepartmentDto) {
    const idx = this.store.findIndex((d) => d.id === id);
    if (idx === -1) throw new NotFoundException(`Department "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }

  remove(id: string) {
    const idx = this.store.findIndex((d) => d.id === id);
    if (idx === -1) throw new NotFoundException(`Department "${id}" not found`);
    const [removed] = this.store.splice(idx, 1);
    return { message: `Department "${removed.name}" deleted` };
  }
}
