import { Injectable, NotFoundException } from '@nestjs/common';
import { qcReviews as seed } from '../../data/seed.data';
import { CreateQcReviewDto, UpdateQcReviewDto } from './qc-reviews.dto';

@Injectable()
export class QcReviewsService {
  private store: any[] = seed.map((r) => ({ ...r }));
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
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((r) => r.id === id);
    if (idx === -1) throw new NotFoundException(`QC review "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `QC review "${id}" deleted` };
  }
}
