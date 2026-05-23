import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './work-orders.dto';
import { RequestsService } from '../requests/requests.service';

const ORDER_FLOW = ['DRAFT', 'PENDING_OFFICER_APPROVAL', 'PENDING_ADMIN_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'PENDING_QC', 'COMPLETED'];
const TERMINAL_ORDER_STATUSES = ['REJECTED', 'CANCELLED'];

@Injectable()
export class WorkOrdersService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly requestsService: RequestsService,
  ) {}

  private ensureRequestPlanningEligibility(request: any, departmentId: string) {
    if (request.departmentId !== departmentId) throw new BadRequestException('Work order department must match the linked citizen request department.');
    if (!['APPROVED_FOR_PLANNING', 'CONVERTED_TO_WORK_ORDER'].includes(request.status)) throw new BadRequestException(`Linked request must be APPROVED_FOR_PLANNING before conversion. Current status is "${request.status}".`);
  }

  private ensureValidStatusTransition(currentStatus: string, nextStatus: string) {
    if (!nextStatus || currentStatus === nextStatus) return;
    if (TERMINAL_ORDER_STATUSES.includes(nextStatus)) {
      if (currentStatus === 'COMPLETED') throw new BadRequestException('Completed work orders cannot be rejected or cancelled.');
      return;
    }
    const currentIndex = ORDER_FLOW.indexOf(currentStatus);
    const nextIndex = ORDER_FLOW.indexOf(nextStatus);
    if (currentIndex === -1 || nextIndex === -1) throw new BadRequestException(`Invalid work-order lifecycle transition: ${currentStatus} -> ${nextStatus}`);
    if (currentStatus === 'PENDING_OFFICER_APPROVAL' && nextStatus === 'APPROVED') return;
    if (nextIndex !== currentIndex + 1) throw new BadRequestException('Work order lifecycle must follow: DRAFT -> PENDING_OFFICER_APPROVAL -> PENDING_ADMIN_APPROVAL -> APPROVED -> IN_PROGRESS -> PENDING_QC -> COMPLETED');
  }

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM work_orders ORDER BY created_at DESC');
    return rows.map(r => this.withAssignmentSummary(this.mapRow(r)));
  }

  async findByDepartment(deptId: string) {
    const { rows } = await this.db.query('SELECT * FROM work_orders WHERE department_id = $1 ORDER BY created_at DESC', [deptId]);
    return rows.map(r => this.withAssignmentSummary(this.mapRow(r)));
  }

  async findByEngineer(engId: string) {
    const { rows } = await this.db.query('SELECT * FROM work_orders WHERE engineer_id = $1 ORDER BY created_at DESC', [engId]);
    return rows.map(r => this.withAssignmentSummary(this.mapRow(r)));
  }

  async findByRequest(reqId: string) {
    const { rows } = await this.db.query('SELECT * FROM work_orders WHERE request_id = $1 ORDER BY created_at DESC', [reqId]);
    return rows.map(r => this.withAssignmentSummary(this.mapRow(r)));
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM work_orders WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Work order "${id}" not found`);
    return this.withAssignmentSummary(this.mapRow(rows[0]));
  }

  async create(dto: CreateWorkOrderDto) {
    if (dto.requestId) {
      const req = await this.requestsService.findOne(dto.requestId);
      this.ensureRequestPlanningEligibility(req, dto.departmentId);
    }
    const status = dto.status || 'DRAFT';
    if (status === 'COMPLETED') throw new BadRequestException('A work order cannot be created directly in COMPLETED state.');
    if (status === 'IN_PROGRESS' && !dto.engineerId) throw new BadRequestException('Assign an engineer before moving a work order to IN_PROGRESS.');

    const id = `wo-${Date.now()}`;
    const referenceNo = `WO-${String(Date.now()).slice(-4)}`;
    const { rows } = await this.db.query(
      `INSERT INTO work_orders (id, reference_no, department_id, request_id, title, description, location_text, engineer_id, priority, status, due_date, notes, is_emergency)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, referenceNo, dto.departmentId, dto.requestId || null, dto.title, dto.description || null,
       (dto as any).locationText || null, dto.engineerId || '', dto.priority || 'MEDIUM', status,
       dto.dueDate || null, dto.notes || null, (dto as any).isEmergency || false],
    );
    if (dto.requestId) await this.requestsService.transitionToWorkOrder(dto.requestId);
    return this.withAssignmentSummary(this.mapRow(rows[0]));
  }

  async update(id: string, dto: UpdateWorkOrderDto) {
    const current = await this.findOne(id);
    const nextStatus = dto.status || current.status;
    this.ensureValidStatusTransition(current.status, nextStatus);
    const nextEngineerId = dto.engineerId !== undefined ? dto.engineerId : current.engineerId;
    if (nextStatus === 'IN_PROGRESS' && !nextEngineerId) throw new BadRequestException('Assign an engineer before moving a work order to IN_PROGRESS.');

    const fields: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    const map: Record<string, string> = { status: 'status', engineerId: 'engineer_id', priority: 'priority', title: 'title', description: 'description', dueDate: 'due_date', notes: 'notes', approvedBy: 'approved_by', rejectedBy: 'rejected_by', qcPassed: 'qc_passed' };
    for (const [k, col] of Object.entries(map)) {
      if ((dto as any)[k] !== undefined) { fields.push(`${col} = $${idx++}`); vals.push((dto as any)[k]); }
    }
    fields.push(`updated_at = NOW()`);
    vals.push(id);
    const { rows } = await this.db.query(`UPDATE work_orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    return this.withAssignmentSummary(this.mapRow(rows[0]));
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM work_orders WHERE id = $1', [id]);
    return { message: `Work order "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      referenceNo: r.reference_no,
      departmentId: r.department_id,
      requestId: r.request_id,
      title: r.title,
      description: r.description,
      locationText: r.location_text,
      engineerId: r.engineer_id,
      priority: r.priority,
      status: r.status,
      dueDate: r.due_date,
      notes: r.notes,
      approvedBy: r.approved_by,
      approvedAt: r.approved_at,
      rejectedBy: r.rejected_by,
      rejectedAt: r.rejected_at,
      isEmergency: r.is_emergency,
      qcPassed: r.qc_passed,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private withAssignmentSummary(item: any) {
    return {
      ...item,
      assignmentModel: item.engineerId ? 'Task-style field assignment' : 'Awaiting task assignment',
      assignmentNote: item.engineerId
        ? 'This stores the assigned engineer on the work order while presenting it as a task-style assignment.'
        : 'Officer planning should assign this work to a field engineer before execution.',
    };
  }
}
