import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto, UpdateInspectionDto } from './inspections.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('inspections')
@UseGuards(RolesGuard)
export class InspectionsController {
  constructor(private readonly svc: InspectionsService) {}

  @Get() findAll(@Query('engineerId') engId?: string) {
    return engId ? this.svc.findByEngineer(engId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('OFFICER', 'ENGINEER') create(@Body() dto: CreateInspectionDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('OFFICER', 'ENGINEER') update(@Param('id') id: string, @Body() dto: UpdateInspectionDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR', 'OFFICER', 'ENGINEER') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
