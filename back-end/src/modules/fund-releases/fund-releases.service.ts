import { Injectable, NotFoundException } from '@nestjs/common';
import { fundReleases as seed } from '../../data/seed.data';
import { CreateFundReleaseDto, UpdateFundReleaseDto } from './fund-releases.dto';

@Injectable()
export class FundReleasesService {
  private store: any[] = seed.map((r) => ({ ...r }));
  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((r) => r.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((r) => r.id === id);
    if (!item) throw new NotFoundException(`Fund release "${id}" not found`);
    return item;
  }
  create(dto: CreateFundReleaseDto) {
    const record = { id: `release-${Date.now()}`, status: dto.status || 'PENDING', releasedAt: null, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateFundReleaseDto) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Fund release "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`Fund release "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Fund release "${id}" deleted` };
  }
}
