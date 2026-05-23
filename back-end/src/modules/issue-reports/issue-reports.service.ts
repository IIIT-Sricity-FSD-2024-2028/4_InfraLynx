import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { CreateIssueReportDto, UpdateIssueReportDto } from './issue-reports.dto';

@Injectable()
export class IssueReportsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM issue_reports ORDER BY created_at DESC');
    return rows.map(this.mapRow);
  }

  async findByEngineer(engId: string) {
    const { rows } = await this.db.query('SELECT * FROM issue_reports WHERE engineer_id = $1 ORDER BY created_at DESC', [engId]);
    return rows.map(this.mapRow);
  }

  async findOne(id: string) {
    const { rows } = await this.db.query('SELECT * FROM issue_reports WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Issue report "${id}" not found`);
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateIssueReportDto) {
    const id = `issue-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO issue_reports (id, department_id, engineer_id, title, category, location_text, severity, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.title, dto.category || null,
       (dto as any).locationText || null, dto.severity || 'LOW', dto.status || 'OPEN'],
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, dto: UpdateIssueReportDto) {
    const current = await this.findOne(id);
    const { rows } = await this.db.query(
      `UPDATE issue_reports SET status=$1, severity=$2, title=$3, category=$4, location_text=$5, engineer_id=$6 WHERE id=$7 RETURNING *`,
      [dto.status ?? current.status, dto.severity ?? current.severity, dto.title ?? current.title,
       dto.category ?? current.category, (dto as any).locationText ?? current.locationText,
       dto.engineerId ?? current.engineerId, id],
    );
    return this.mapRow(rows[0]);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM issue_reports WHERE id = $1', [id]);
    return { message: `Issue report "${id}" deleted` };
  }

  private mapRow(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      title: r.title,
      category: r.category,
      locationText: r.location_text,
      severity: r.severity,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
