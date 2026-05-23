import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Injectable()
export class DepartmentsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM departments ORDER BY name');
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM departments WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Department "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateDepartmentDto) {
    const check = await this.db.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [dto.name]);
    if (check.rows.length) throw new ConflictException('A department with this name already exists');
    const id = `dept-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO departments (id, name, public_label, lead, budget_cr, utilization, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, dto.name, (dto as any).publicLabel || null, (dto as any).lead || null,
       (dto as any).budgetCr || 0, (dto as any).utilization || 0, (dto as any).description || null],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    const fields: string[] = [];
    const vals: any[] = [];
    let idx = 1;
    const map: Record<string, string> = { name: 'name', publicLabel: 'public_label', lead: 'lead', budgetCr: 'budget_cr', utilization: 'utilization', description: 'description' };
    for (const [k, col] of Object.entries(map)) {
      if ((dto as any)[k] !== undefined) { fields.push(`${col} = $${idx++}`); vals.push((dto as any)[k]); }
    }
    if (!fields.length) return this.findOne(id);
    vals.push(id);
    const { rows } = await this.db.query(`UPDATE departments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, vals);
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    const item = await this.findOne(id);
    await this.db.query('DELETE FROM departments WHERE id = $1', [id]);
    return { message: `Department "${item.name}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      name: r.name,
      publicLabel: r.public_label,
      lead: r.lead,
      budgetCr: parseFloat(r.budget_cr) || 0,
      utilization: r.utilization,
      description: r.description,
      createdAt: r.created_at,
    };
  }
}
