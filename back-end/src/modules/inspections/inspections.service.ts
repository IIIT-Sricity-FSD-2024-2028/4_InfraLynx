import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateInspectionDto, UpdateInspectionDto } from './inspections.dto';

@Injectable()
export class InspectionsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM inspections ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByEngineer(engId: string) {
    const { rows } = await this.db.query('SELECT * FROM inspections WHERE engineer_id = $1 ORDER BY created_at DESC', [engId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM inspections WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Inspection "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateInspectionDto) {
    const id = `inspection-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO inspections (id, department_id, engineer_id, title, location_text, severity, due_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.title, (dto as any).locationText || null, dto.severity || 'LOW', dto.dueDate || null, dto.status || 'PENDING'],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateInspectionDto) {
    const current = await this.findOne(id);
    const { rows } = await this.db.query(
      `UPDATE inspections SET status=$1, severity=$2, title=$3, location_text=$4, engineer_id=$5, due_date=$6 WHERE id=$7 RETURNING *`,
      [dto.status ?? current.status, dto.severity ?? current.severity, dto.title ?? current.title,
       (dto as any).locationText ?? current.locationText, dto.engineerId ?? current.engineerId,
       dto.dueDate ?? current.dueDate, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM inspections WHERE id = $1', [id]);
    return { message: `Inspection "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      title: r.title,
      locationText: r.location_text,
      severity: r.severity,
      dueDate: r.due_date,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
