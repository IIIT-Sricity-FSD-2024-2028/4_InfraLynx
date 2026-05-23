import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateProcurementBillDto, UpdateProcurementBillDto } from './procurement-bills.dto';

const BILL_FLOW = ['SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'PAID'];

@Injectable()
export class ProcurementBillsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  private ensureValidBillTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (nextStatus === 'REJECTED') {
      if (currentStatus === 'PAID') throw new BadRequestException('A paid bill cannot be rejected.');
      return;
    }
    const currentIndex = BILL_FLOW.indexOf(currentStatus);
    const nextIndex = BILL_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid procurement bill transition: ${currentStatus} -> ${nextStatus}`);
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Bill lifecycle must follow: SUBMITTED -> UNDER_VERIFICATION -> APPROVED -> PAID');
  }

  private ensureGstCompliance(nextStatus: string, gstValid: boolean) {
    if (['APPROVED', 'PAID'].includes(nextStatus) && !gstValid) throw new BadRequestException('GST must be verified before approving or paying a procurement bill.');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM procurement_bills ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByDepartment(deptId: string) {
    const { rows } = await this.db.query('SELECT * FROM procurement_bills WHERE department_id = $1 ORDER BY created_at DESC', [deptId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM procurement_bills WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Procurement bill "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateProcurementBillDto) {
    const status = dto.status || 'SUBMITTED';
    this.ensureGstCompliance(status, dto.gstValid);
    const id = `bill-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO procurement_bills (id, department_id, vendor, work_order_id, amount_lakhs, gst_valid, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, dto.departmentId, dto.vendor, (dto as any).workOrderId || null, dto.amountLakhs, dto.gstValid, status],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateProcurementBillDto) {
    const current = await this.findOne(id);
    const nextStatus = dto.status || current.status;
    const nextGst = dto.gstValid ?? current.gstValid;
    this.ensureValidBillTransition(current.status, nextStatus);
    this.ensureGstCompliance(nextStatus, nextGst);
    const { rows } = await this.db.query(
      `UPDATE procurement_bills SET status=$1, gst_valid=$2, vendor=$3, amount_lakhs=$4 WHERE id=$5 RETURNING *`,
      [nextStatus, nextGst, dto.vendor ?? current.vendor, dto.amountLakhs ?? current.amountLakhs, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM procurement_bills WHERE id = $1', [id]);
    return { message: `Procurement bill "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      vendor: r.vendor,
      workOrderId: r.work_order_id,
      amountLakhs: parseFloat(r.amount_lakhs),
      gstValid: r.gst_valid,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
