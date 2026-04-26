import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('departments')
@UseGuards(RolesGuard)
export class DepartmentsController {
  constructor(private readonly svc: DepartmentsService) {}

  /** GET /departments â€” All roles can view */
  @Get() findAll() { return this.svc.findAll(); }

  /** GET /departments/:id */
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  /** POST /departments â€” ADMINISTRATOR only */
  @Post() @Roles('ADMINISTRATOR') create(@Body() dto: CreateDepartmentDto) { return this.svc.create(dto); }

  /** PATCH /departments/:id â€” ADMINISTRATOR only */
  @Patch(':id') @Roles('ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) { return this.svc.update(id, dto); }

  /** DELETE /departments/:id â€” ADMINISTRATOR only */
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
