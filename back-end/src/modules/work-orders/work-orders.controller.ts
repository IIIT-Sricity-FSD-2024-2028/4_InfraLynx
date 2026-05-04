import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { WorkOrdersService } from './work-orders.service';
import { CreateWorkOrderDto, UpdateWorkOrderDto } from './work-orders.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('work-orders')
@UseGuards(RolesGuard)
export class WorkOrdersController {
  constructor(private readonly svc: WorkOrdersService) {}

  @Get() findAll(@Query('departmentId') deptId?: string, @Query('engineerId') engId?: string, @Query('requestId') reqId?: string) {
    if (engId) return this.svc.findByEngineer(engId);
    if (reqId) return this.svc.findByRequest(reqId);
    if (deptId) return this.svc.findByDepartment(deptId);
    return this.svc.findAll();
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post() @Roles('ADMINISTRATOR', 'OFFICER') create(@Body() dto: CreateWorkOrderDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles('ADMINISTRATOR', 'OFFICER', 'ENGINEER') update(@Param('id') id: string, @Body() dto: UpdateWorkOrderDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles('ADMINISTRATOR', 'OFFICER') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
