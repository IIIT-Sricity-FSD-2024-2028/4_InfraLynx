import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import {
  CreateMaintenanceScheduleDto, UpdateMaintenanceScheduleDto,
  CreateMaintenanceLogDto, UpdateMaintenanceLogDto,
} from './maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAllSchedules() {
    const { rows } = await this.db.query('SELECT * FROM maintenance_schedules ORDER BY created_at DESC');
    return rows.map(this.mapSchedule);
  }

  async findSchedule(id: string) {
    const { rows } = await this.db.query('SELECT * FROM maintenance_schedules WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Schedule "${id}" not found`);
    return this.mapSchedule(rows[0]);
  }

  async createSchedule(dto: CreateMaintenanceScheduleDto) {
    const id = `schedule-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO maintenance_schedules (id, department_id, title, frequency, next_date, assignee)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, dto.departmentId, dto.title, dto.frequency || 'ONE_TIME', dto.nextDate || null, dto.assignee || ''],
    );
    return this.mapSchedule(rows[0]);
  }

  async updateSchedule(id: string, dto: UpdateMaintenanceScheduleDto) {
    const current = await this.findSchedule(id);
    const { rows } = await this.db.query(
      `UPDATE maintenance_schedules SET title=$1, frequency=$2, next_date=$3, assignee=$4 WHERE id=$5 RETURNING *`,
      [dto.title ?? current.title, dto.frequency ?? current.frequency, dto.nextDate ?? current.nextDate, dto.assignee ?? current.assignee, id],
    );
    return this.mapSchedule(rows[0]);
  }

  async removeSchedule(id: string) {
    await this.findSchedule(id);
    await this.db.query('DELETE FROM maintenance_schedules WHERE id = $1', [id]);
    return { message: `Schedule "${id}" deleted` };
  }

  async findAllLogs() {
    const { rows } = await this.db.query('SELECT * FROM maintenance_logs ORDER BY created_at DESC');
    return rows.map(this.mapLog);
  }

  async findLog(id: string) {
    const { rows } = await this.db.query('SELECT * FROM maintenance_logs WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException(`Maintenance log "${id}" not found`);
    return this.mapLog(rows[0]);
  }

  async createLog(dto: CreateMaintenanceLogDto) {
    const id = `mlog-${Date.now()}`;
    const { rows } = await this.db.query(
      `INSERT INTO maintenance_logs (id, department_id, engineer_id, schedule_id, work_order_id, title, activity, hours_spent, date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, dto.departmentId, dto.engineerId || null, dto.scheduleId || null, dto.workOrderId || null,
       dto.title, dto.activity || null, dto.hoursSpent || null, dto.date || null, dto.status || 'PENDING'],
    );
    return this.mapLog(rows[0]);
  }

  async updateLog(id: string, dto: UpdateMaintenanceLogDto) {
    const current = await this.findLog(id);
    const { rows } = await this.db.query(
      `UPDATE maintenance_logs SET status=$1, title=$2, activity=$3, hours_spent=$4, date=$5 WHERE id=$6 RETURNING *`,
      [dto.status ?? current.status, dto.title ?? current.title, dto.activity ?? current.activity,
       dto.hoursSpent ?? current.hoursSpent, dto.date ?? current.date, id],
    );
    return this.mapLog(rows[0]);
  }

  async removeLog(id: string) {
    await this.findLog(id);
    await this.db.query('DELETE FROM maintenance_logs WHERE id = $1', [id]);
    return { message: `Maintenance log "${id}" deleted` };
  }

  private mapSchedule(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      title: r.title,
      frequency: r.frequency,
      nextDate: r.next_date,
      assignee: r.assignee,
      createdAt: r.created_at,
    };
  }

  private mapLog(r: any) {
    return {
      id: r.id,
      departmentId: r.department_id,
      engineerId: r.engineer_id,
      scheduleId: r.schedule_id,
      workOrderId: r.work_order_id,
      title: r.title,
      activity: r.activity,
      hoursSpent: r.hours_spent ? parseFloat(r.hours_spent) : null,
      date: r.date,
      status: r.status,
      createdAt: r.created_at,
    };
  }
}
