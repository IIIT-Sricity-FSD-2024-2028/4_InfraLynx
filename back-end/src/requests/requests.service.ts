import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { requests as seed, serviceCategories } from '../data/seed.data';
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
    };
    this.store.unshift(record);
    return record;
  }

  update(id: string, dto: UpdateRequestDto) {
    const idx = this.store.findIndex((r) => r.requestId === id);
    if (idx === -1) throw new NotFoundException(`Request "${id}" not found`);
    this.store[idx] = { ...this.store[idx], ...dto };
    return this.store[idx];
  }

  remove(id: string) {
    const idx = this.store.findIndex((r) => r.requestId === id);
    if (idx === -1) throw new NotFoundException(`Request "${id}" not found`);
    this.store.splice(idx, 1);
    return { message: `Request "${id}" deleted` };
  }
}
