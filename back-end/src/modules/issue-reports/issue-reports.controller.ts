import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { IssueReportsService } from './issue-reports.service';
import { CreateIssueReportDto, UpdateIssueReportDto } from './issue-reports.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('issue-reports')
@UseGuards(RolesGuard)
export class IssueReportsController {
  constructor(private readonly svc: IssueReportsService) {}

  @Get() findAll(@Query('engineerId') engId?: string) {
    return engId ? this.svc.findByEngineer(engId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('ENGINEER') create(@Body() dto: CreateIssueReportDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('ENGINEER', 'OFFICER', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateIssueReportDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR', 'OFFICER') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
