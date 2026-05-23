import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateQuotationDto, UpdateQuotationDto } from './quotations.dto';

const QUOTATION_FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'];

@Injectable()
export class QuotationsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  private ensureValidQuotationTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (nextStatus === 'REJECTED') return;
    const currentIndex = QUOTATION_FLOW.indexOf(currentStatus);
    const nextIndex = QUOTATION_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid quotation transition: ${currentStatus} -> ${nextStatus}`);
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Quotation lifecycle must follow: SUBMITTED -> UNDER_REVIEW -> ACCEPTED');
  }

  private ensureAcceptanceCompliance(status: string, gstValid: boolean) {
    if (status === 'ACCEPTED' && !gstValid) throw new BadRequestException('Quotation cannot be accepted until GST validation is complete.');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM quotations ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByDepartment(deptId: string) {
    const { rows } = await this.db.query('SELECT * FROM quotations WHERE department_id = $1 ORDER BY created_at DESC', [deptId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Quotation "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateQuotationDto) {
    this.ensureAcceptanceCompliance(dto.status, dto.gstValid);
    const id = `quote-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO quotations (id, department_id, vendor, item, amount_lakhs, gst_valid, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, dto.departmentId, dto.vendor, dto.item, dto.amountLakhs, dto.gstValid, dto.status || 'SUBMITTED'],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateQuotationDto) {
    const current = await this.findOne(id);
    const nextStatus = dto.status || current.status;
    const nextGst = dto.gstValid ?? current.gstValid;
    this.ensureValidQuotationTransition(current.status, nextStatus);
    this.ensureAcceptanceCompliance(nextStatus, nextGst);
    const { rows } = await this.db.query(
      `UPDATE quotations SET status=$1, gst_valid=$2, vendor=$3, item=$4, amount_lakhs=$5 WHERE id=$6 RETURNING *`,
      [nextStatus, nextGst, dto.vendor ?? current.vendor, dto.item ?? current.item, dto.amountLakhs ?? current.amountLakhs, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM quotations WHERE id = $1', [id]);
    return { message: `Quotation "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      vendor: r.vendor,
      item: r.item,
      amountLakhs: parseFloat(r.amount_lakhs),
      gstValid: r.gst_valid,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
