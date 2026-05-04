import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { requests as seed, serviceCategories } from '../../data/seed.data';
import { CreateRequestDto, UpdateRequestDto } from './requests.dto';

const STATUS_STEPS = ['RECEIVED', 'UNDER_REVIEW', 'APPROVED_FOR_PLANNING', 'CONVERTED_TO_WORK_ORDER', 'CLOSED'];

function genRef(existing: any[]): string {
  const year = new Date().getFullYear();
  const max = existing.reduce((acc, r) => {
    const m = String(r.publicReferenceNo || '').match(/CRIMS-\d{4}-(\d+)/);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `CRIMS-${year}-${String(max + 1).padStart(4, '0')}`;
}

@Injectable()
export class RequestsService {
  private store = seed.map((r) => ({ ...r }));

  private ensureValidTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) {
      return;
    }

    // Allow rejection from any non-closed state in this prototype flow.
    if (nextStatus === 'REJECTED' && currentStatus !== 'CLOSED') {
      return;
    }

    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    const nextIndex = STATUS_STEPS.indexOf(nextStatus);

    if (currentIndex === -1 || nextIndex === -1) {
      throw new BadRequestException(`Invalid lifecycle transition: ${currentStatus} -> ${nextStatus}`);
    }

    if (nextIndex !== currentIndex + 1) {
      throw new BadRequestException(
        `Lifecycle must follow: RECEIVED -> UNDER_REVIEW -> APPROVED_FOR_PLANNING -> CONVERTED_TO_WORK_ORDER -> CLOSED`
      );
    }
  }

  findAll() { return this.store; }

  findByAadhaar(aadhaar: string) {
    return this.store.filter((r) => r.citizenAadhaar === aadhaar)
      .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  }

  findByRef(ref: string) {
    const item = this.store.find((r) => r.publicReferenceNo === ref.toUpperCase().trim());
    if (!item) throw new NotFoundException(`Reference "${ref}" not found`);
    return item;
  }

  findOne(id: string) {
    const item = this.store.find((r) => r.requestId === id);
    if (!item) throw new NotFoundException(`Request "${id}" not found`);
    return item;
  }

  create(dto: CreateRequestDto) {
    const cat = serviceCategories.find((c) => c.id === dto.categoryId);
    if (!cat) throw new BadRequestException('Invalid categoryId');
    const record = {
      requestId: `request-${Date.now()}`,
      publicReferenceNo: genRef(this.store),
      departmentId: cat.departmentId,
      status: 'RECEIVED',
      receivedAt: new Date().toISOString(),
      ...dto,
      citizenAadhaar: dto.citizenAadhaar || 'PUBLIC-DEMO',
    };
    this.store.unshift(record);
    return record;
  }

  update(id: string, dto: UpdateRequestDto) {
    const idx = this.store.findIndex((r) => r.requestId === id);
    if (idx === -1) throw new NotFoundException(`Request "${id}" not found`);
    if (dto.status) {
      this.ensureValidTransition(this.store[idx].status, dto.status);
    }
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }

  transitionToWorkOrder(requestId: string) {
    const idx = this.store.findIndex((r) => r.requestId === requestId);
    if (idx === -1) throw new NotFoundException(`Request "${requestId}" not found`);

    const currentStatus = this.store[idx].status;
    if (currentStatus === 'CONVERTED_TO_WORK_ORDER' || currentStatus === 'CLOSED') {
      return this.store[idx];
    }

    this.ensureValidTransition(currentStatus, 'CONVERTED_TO_WORK_ORDER');
    this.store[idx] = { ...this.store[idx], status: 'CONVERTED_TO_WORK_ORDER' };
    return this.store[idx];
  }

  closeAfterQcCertification(requestId: string) {
    const idx = this.store.findIndex((r) => r.requestId === requestId);
    if (idx === -1) throw new NotFoundException(`Request "${requestId}" not found`);

    const currentStatus = this.store[idx].status;
    if (currentStatus === 'CLOSED') {
      return this.store[idx];
    }

    this.ensureValidTransition(currentStatus, 'CLOSED');
    this.store[idx] = { ...this.store[idx], status: 'CLOSED' };
    return this.store[idx];
  }

  remove(id: string) {
    const idx = this.store.findIndex((r) => r.requestId === id);
    if (idx === -1) throw new NotFoundException(`Request "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Request "${id}" deleted` };
  }
}
