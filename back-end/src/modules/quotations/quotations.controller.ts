import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto, UpdateQuotationDto } from './quotations.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('quotations')
@UseGuards(RolesGuard)
export class QuotationsController {
  constructor(private readonly svc: QuotationsService) {}

  @Get() findAll(@Query('departmentId') deptId?: string) {
    return deptId ? this.svc.findByDepartment(deptId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('OFFICER', 'CFO') create(@Body() dto: CreateQuotationDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('OFFICER', 'CFO', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateQuotationDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR', 'OFFICER') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
