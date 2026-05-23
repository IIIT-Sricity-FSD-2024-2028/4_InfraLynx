import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateResourceRequestDto, UpdateResourceRequestDto } from './resource-requests.dto';

@Injectable()
export class ResourceRequestsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM resource_requests ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByEngineer(engId: string) {
    const { rows } = await this.db.query('SELECT * FROM resource_requests WHERE engineer_id = $1 ORDER BY created_at DESC', [engId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM resource_requests WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Resource request "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateResourceRequestDto) {
    const id = `resource-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO resource_requests (id, department_id, engineer_id, item, quantity, urgency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.item, dto.quantity || null,
       dto.urgency || 'MEDIUM', dto.status || 'PENDING'],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateResourceRequestDto) {
    const current = await this.findOne(id);
    const { rows } = await this.db.query(
      `UPDATE resource_requests SET status=$1, urgency=$2, item=$3, quantity=$4, engineer_id=$5 WHERE id=$6 RETURNING *`,
      [dto.status ?? current.status, dto.urgency ?? current.urgency, dto.item ?? current.item,
       dto.quantity ?? current.quantity, dto.engineerId ?? current.engineerId, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM resource_requests WHERE id = $1', [id]);
    return { message: `Resource request "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      item: r.item,
      quantity: r.quantity,
      urgency: r.urgency,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
