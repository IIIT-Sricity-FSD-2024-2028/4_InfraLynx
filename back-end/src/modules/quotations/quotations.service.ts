import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { quotations as seed } from '../../data/seed.data';
import { CreateQuotationDto, UpdateQuotationDto } from './quotations.dto';

const QUOTATION_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'];

@Injectable()
export class QuotationsService {
  private store = seed.map((q) => ({ ...q }));

  private ensureValidQuotationTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (nextStatus === 'REJECTED') return;

    const currentIndex = QUOTATION_FLOW.indexOf(currentStatus);
    const nextIndex = QUOTATION_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid quotation transition: ${currentStatus} -> ${nextStatus}`);
    }
    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException('Quotation lifecycle must follow: SUBMITTED -> UNDER_REVIEW -> ACCEPTED');
    }
  }

  private ensureAcceptanceCompliance(status: string, gstValid: boolean) {
    if (status === 'ACCEPTED' && !gstValid) {
      throw new BadRequestException('Quotation cannot be accepted until GST validation is complete.');
    }
  }

  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((q) => q.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((q) => q.id === id);
    if (!item) throw new NotFoundException(`Quotation "${id}" not found`);
    return item;
  }
  create(dto: CreateQuotationDto) {
    this.ensureAcceptanceCompliance(dto.status, dto.gstValid);
    const record = { id: `quote-${Date.now()}`, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateQuotationDto) {
    const idx = this.store.findIndex((q) => q.id === id);
    if (idx === -1) throw new NotFoundException(`Quotation "${id}" not found`);
    const current = this.store[idx];
    const nextStatus = dto.status || current.status;
    const nextGst = dto.gstValid ?? current.gstValid;
    this.ensureValidQuotationTransition(current.status, nextStatus);
    this.ensureAcceptanceCompliance(nextStatus, nextGst);
    this.store[idx] = { ...current, ...dto, status: nextStatus, gstValid: nextGst };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((q) => q.id === id);
    if (idx === -1) throw new NotFoundException(`Quotation "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Quotation "${id}" deleted` };
  }
}
