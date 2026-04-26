import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OutcomeReportsService } from './outcome-reports.service';
import { CreateOutcomeReportDto, UpdateOutcomeReportDto } from './outcome-reports.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('outcome-reports')
@UseGuards(RolesGuard)
export class OutcomeReportsController {
  constructor(private readonly svc: OutcomeReportsService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('OFFICER', 'ADMINISTRATOR') create(@Body() dto: CreateOutcomeReportDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('OFFICER', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateOutcomeReportDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
