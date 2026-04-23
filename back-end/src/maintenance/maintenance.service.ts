import { Injectable, NotFoundException } from '@nestjs/common';
import { maintenanceSchedules as seedSched, maintenanceLogs as seedLogs } from '../data/seed.data';
import {
  CreateMaintenanceScheduleDto, UpdateMaintenanceScheduleDto,
  CreateMaintenanceLogDto, UpdateMaintenanceLogDto,
} from './maintenance.dto';

@Injectable()
export class MaintenanceService {
  private schedules: any[] = seedSched.map((s) => ({ ...s }));
  private logs: any[] = seedLogs.map((l) => ({ ...l }));

  // --- Schedules ---
  findAllSchedules() { return this.schedules; }
  findSchedule(id: string) {
    const item = this.schedules.find((s) => s.id === id);
    if (!item) throw new NotFoundException(`Schedule "${id}" not found`);
    return item;
  }
  createSchedule(dto: CreateMaintenanceScheduleDto) {
    const record = { id: `schedule-${Date.now()}`, ...dto };
    this.schedules.unshift(record);
    return record;
  }
  updateSchedule(id: string, dto: UpdateMaintenanceScheduleDto) {
    const idx = this.schedules.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundException(`Schedule "${id}" not found`);
    this.schedules[idx] = { ...this.schedules[idx], ...dto };
    return this.schedules[idx];
  }
  removeSchedule(id: string) {
    const idx = this.schedules.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundException(`Schedule "${id}" not found`);
    this.schedules.splice(idx, 1);
    return { message: `Schedule "${id}" deleted` };
  }

  // --- Logs ---
  findAllLogs() { return this.logs; }
  findLog(id: string) {
    const item = this.logs.find((l) => l.id === id);
    if (!item) throw new NotFoundException(`Maintenance log "${id}" not found`);
    return item;
  }
  createLog(dto: CreateMaintenanceLogDto) {
    const record = { id: `mlog-${Date.now()}`, ...dto };
    this.logs.unshift(record);
    return record;
  }
  updateLog(id: string, dto: UpdateMaintenanceLogDto) {
    const idx = this.logs.findIndex((l) => l.id === id);
    if (idx === -1) throw new NotFoundException(`Maintenance log "${id}" not found`);
    this.logs[idx] = { ...this.logs[idx], ...dto };
    return this.logs[idx];
  }
  removeLog(id: string) {
    const idx = this.logs.findIndex((l) => l.id === id);
    if (idx === -1) throw new NotFoundException(`Maintenance log "${id}" not found`);
    this.logs.splice(idx, 1);
    return { message: `Maintenance log "${id}" deleted` };
  }
}
