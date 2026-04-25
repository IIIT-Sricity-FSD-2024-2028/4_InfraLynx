import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';

@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(private readonly svc: ServiceCategoriesService) {}

  @Get() findAll(@Query('departmentId') deptId?: string) {
    if (deptId) return this.svc.findByDepartment(deptId);
    return this.svc.findAll();
  }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
}
