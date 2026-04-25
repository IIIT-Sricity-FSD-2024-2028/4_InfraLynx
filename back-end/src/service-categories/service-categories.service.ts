import { Injectable, NotFoundException } from '@nestjs/common';
import { serviceCategories as seed } from '../data/seed.data';

@Injectable()
export class ServiceCategoriesService {
  private store = seed.map((c) => ({ ...c }));

  findAll() { return this.store; }
  findOne(id: string) {
    const item = this.store.find((c) => c.id === id);
    if (!item) throw new NotFoundException(`Service category "${id}" not found`);
    return item;
  }
  findByDepartment(departmentId: string) {
    return this.store.filter((c) => c.departmentId === departmentId);
  }
}
