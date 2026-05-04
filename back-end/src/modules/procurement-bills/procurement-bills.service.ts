import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { procurementBills as seed } from '../../data/seed.data';
import { CreateProcurementBillDto, UpdateProcurementBillDto } from './procurement-bills.dto';

const BILL_FLOW = ['SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'PAID'];

@Injectable()
export class ProcurementBillsService {
  private store = seed.map((b) => ({ ...b }));

  private ensureValidBillTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (nextStatus === 'REJECTED') {
      if (currentStatus === 'PAID') {
        throw new BadRequestException('A paid bill cannot be rejected.');
      }
      return;
    }

    const currentIndex = BILL_FLOW.indexOf(currentStatus);
    const nextIndex = BILL_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid procurement bill transition: ${currentStatus} -> ${nextStatus}`);
    }
    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException('Bill lifecycle must follow: SUBMITTED -> UNDER_VERIFICATION -> APPROVED -> PAID');
    }
  }

  private ensureGstCompliance(nextStatus: string, gstValid: boolean) {
    if (['APPROVED', 'PAID'].includes(nextStatus) && !gstValid) {
      throw new BadRequestException('GST must be verified before approving or paying a procurement bill.');
    }
  }

  findAll() { return this.store; }
  findByDepartment(deptId: string) { return this.store.filter((b) => b.departmentId === deptId); }
  findOne(id: string) {
    const item = this.store.find((b) => b.id === id);
    if (!item) throw new NotFoundException(`Procurement bill "${id}" not found`);
    return item;
  }
  create(dto: CreateProcurementBillDto) {
    const status = dto.status || 'SUBMITTED';
    this.ensureGstCompliance(status, dto.gstValid);
    const record = { id: `bill-${Date.now()}`, status, ...dto };
    this.store.unshift(record);
    return record;
  }
  update(id: string, dto: UpdateProcurementBillDto) {
    const idx = this.store.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundException(`Procurement bill "${id}" not found`);
    const current = this.store[idx];
    const nextStatus = dto.status || current.status;
    const nextGst = dto.gstValid ?? current.gstValid;
    this.ensureValidBillTransition(current.status, nextStatus);
    this.ensureGstCompliance(nextStatus, nextGst);
    this.store[idx] = { ...current, ...dto, status: nextStatus, gstValid: nextGst };
    return this.store[idx];
  }
  remove(id: string) {
    const idx = this.store.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundException(`Procurement bill "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Procurement bill "${id}" deleted` };
  }
}
