import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateRequestDto, UpdateRequestDto } from './requests.dto';

const STATUS_STEPS = ['RECEIVED', 'UNDER_REVIEW', 'APPROVED_FOR_PLANNING', 'CONVERTED_TO_WORK_ORDER', 'CLOSED'];

function genRef(maxSeq: number): string {
  const year = new Date().getFullYear();
  return `CRIMS-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
}

@Injectable()
export class RequestsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  private ensureValidTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (nextStatus === 'REJECTED' && currentStatus !== 'CLOSED') return;
    const currentIndex = STATUS_STEPS.indexOf(currentStatus);
    const nextIndex = STATUS_STEPS.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid lifecycle transition: ${currentStatus} -> ${nextStatus}`);
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Lifecycle must follow: RECEIVED -> UNDER_REVIEW -> APPROVED_FOR_PLANNING -> CONVERTED_TO_WORK_ORDER -> CLOSED');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM requests ORDER BY received_at DESC');
    return rows.map(this.mapRow);
  }

  async findByAadhaar(aadhaar: string) {
    const { rows } = await this.db.query('SELECT * FROM requests WHERE citizen_aadhaar = $1 ORDER BY received_at DESC', [aadhaar]);
    return rows.map(this.mapRow);
  }

  async findByRef(ref: string) {
    const { rows } = await this.db.query('SELECT * FROM requests WHERE UPPER(public_reference_no) = $1', [ref.toUpperCase().trim()]);
    if (!rows.length) throw new NotFoundException(`Reference "${ref}" not found`);
    return this.mapRow(rows[0]);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM requests WHERE request_id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Request "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateRequestDto) {
    const catRows = await this.db.query('SELECT * FROM service_categories WHERE id = $1', [dto.categoryId]);
    if (!catRows.rows.length) throw new BadRequestException('Invalid categoryId');
    const cat = catRows.rows[0];

    const maxRes = await this.db.query(`SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(public_reference_no, '[^0-9]', '', 'g') AS INT)), 0) AS max_seq FROM requests`);
    const maxSeq = parseInt(maxRes.rows[0].max_seq) || 0;

    const requestId = `request-${Date.now()}`;
    const publicReferenceNo = genRef(maxSeq);

    const { rows } = await this.db.query(
      `INSERT INTO requests (request_id, public_reference_no, citizen_aadhaar, request_type, category_id, department_id, requester_name, requester_contact, requester_email, title, description, location_text, urgency, status, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'RECEIVED', NOW()) RETURNING *`,
      [requestId, publicReferenceNo, dto.citizenAadhaar || 'PUBLIC-DEMO', dto.requestType || null,
       dto.categoryId, cat.department_id, dto.requesterName || null, dto.requesterContact || null,
       (dto as any).requesterEmail || null, dto.title, dto.description, dto.locationText || null,
       dto.urgency || 'MEDIUM'],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateRequestDto) {
    const current = await this.findOne(id);
    if (dto.status) this.ensureValidTransition(current.status, dto.status);
    const fields: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    const map: Record<string, string> = { status: 'status', urgency: 'urgency', title: 'title', description: 'description', locationText: 'location_text' };
    for (const [k, col] of Object.entries(map)) {
      if ((dto as any)[k] !== undefined) { fields.push(`${col} = $${idx++}`); vals.push((dto as any)[k]); }
    }
    if (!fields.length) return current;
    vals.push(id);
    const { rows } = await this.db.query(`UPDATE requests SET ${fields.join(', ')} WHERE request_id = $${idx} RETURNING *`, vals);
    return this.mapRow(rows[0]);
  }

  async transitionToWorkOrder(requestId: string) {
    const current = await this.findOne(requestId);
    if (['CONVERTED_TO_WORK_ORDER', 'CLOSED'].includes(current.status)) return current;
    this.ensureValidTransition(current.status, 'CONVERTED_TO_WORK_ORDER');
    const { rows } = await this.db.query(`UPDATE requests SET status = 'CONVERTED_TO_WORK_ORDER' WHERE request_id = $1 RETURNING *`, [requestId]);
    return this.mapRow(rows[0]);
  }

  async closeAfterQcCertification(requestId: string) {
    const current = await this.findOne(requestId);
    if (current.status === 'CLOSED') return current;
    this.ensureValidTransition(current.status, 'CLOSED');
    const { rows } = await this.db.query(`UPDATE requests SET status = 'CLOSED', closed_at = NOW() WHERE request_id = $1 RETURNING *`, [requestId]);
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM requests WHERE request_id = $1', [id]);
    return { message: `Request "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      requestId: r.request_id,
      publicReferenceNo: r.public_reference_no,
      citizenAadhaar: r.citizen_aadhaar,
      requestType: r.request_type,
      categoryId: r.category_id,
      departmentId: r.department_id,
      requesterName: r.requester_name,
      requesterContact: r.requester_contact,
      requesterEmail: r.requester_email,
      title: r.title,
      description: r.description,
      locationText: r.location_text,
      urgency: r.urgency,
      status: r.status,
      receivedAt: r.received_at,
      closedAt: r.closed_at,
    };
  }
}
