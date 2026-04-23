import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ProcurementBillsService } from './procurement-bills.service';
import { CreateProcurementBillDto, UpdateProcurementBillDto } from './procurement-bills.dto';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('procurement-bills')
@UseGuards(RolesGuard)
export class ProcurementBillsController {
  constructor(private readonly svc: ProcurementBillsService) {}

  @Get() findAll(@Query('departmentId') deptId?: string) {
    return deptId ? this.svc.findByDepartment(deptId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('OFFICER', 'ADMINISTRATOR') create(@Body() dto: CreateProcurementBillDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('CFO', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateProcurementBillDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
