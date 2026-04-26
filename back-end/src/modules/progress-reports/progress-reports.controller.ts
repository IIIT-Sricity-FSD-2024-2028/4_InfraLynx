import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ProgressReportsService } from './progress-reports.service';
import { CreateProgressReportDto, UpdateProgressReportDto } from './progress-reports.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('progress-reports')
@UseGuards(RolesGuard)
export class ProgressReportsController {
  constructor(private readonly svc: ProgressReportsService) {}

  @Get() findAll(@Query('engineerId') engId?: string, @Query('workOrderId') woId?: string) {
    if (woId) return this.svc.findByWorkOrder(woId);
    if (engId) return this.svc.findByEngineer(engId);
    return this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('ENGINEER') create(@Body() dto: CreateProgressReportDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('ENGINEER', 'OFFICER', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateProgressReportDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
