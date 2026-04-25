import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import {
  CreateMaintenanceScheduleDto, UpdateMaintenanceScheduleDto,
  CreateMaintenanceLogDto, UpdateMaintenanceLogDto,
} from './maintenance.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('maintenance')
@UseGuards(RolesGuard)
export class MaintenanceController {
  constructor(private readonly svc: MaintenanceService) {}

  // Schedules
  @Get('schedules') getSchedules() { return this.svc.findAllSchedules(); }
  @Get('schedules/:id') getSchedule(@Param('id') id: string) { return this.svc.findSchedule(id); }
  @Post('schedules') @Roles('OFFICER', 'ADMINISTRATOR') createSchedule(@Body() dto: CreateMaintenanceScheduleDto) { return this.svc.createSchedule(dto); }
  @Patch('schedules/:id') @Roles('OFFICER', 'ADMINISTRATOR') updateSchedule(@Param('id') id: string, @Body() dto: UpdateMaintenanceScheduleDto) { return this.svc.updateSchedule(id, dto); }
  @Delete('schedules/:id') @Roles('ADMINISTRATOR') removeSchedule(@Param('id') id: string) { return this.svc.removeSchedule(id); }

  // Logs
  @Get('logs') getLogs() { return this.svc.findAllLogs(); }
  @Get('logs/:id') getLog(@Param('id') id: string) { return this.svc.findLog(id); }
  @Post('logs') @Roles('ENGINEER') createLog(@Body() dto: CreateMaintenanceLogDto) { return this.svc.createLog(dto); }
  @Patch('logs/:id') @Roles('ENGINEER', 'OFFICER') updateLog(@Param('id') id: string, @Body() dto: UpdateMaintenanceLogDto) { return this.svc.updateLog(id, dto); }
  @Delete('logs/:id') @Roles('ADMINISTRATOR') removeLog(@Param('id') id: string) { return this.svc.removeLog(id); }
}
