import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';

@Injectable()
export class ServiceCategoriesService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM service_categories ORDER BY id');
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM service_categories WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Service category "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async findByDepartment(departmentId: string) {
    const { rows } = await this.db.query('SELECT * FROM service_categories WHERE department_id = $1', [departmentId]);
    return rows.map(this.mapRow);
  }

  private mapRow(r: any) {
    return { id: r.id, label: r.label, departmentId: r.department_id };
  }
}
