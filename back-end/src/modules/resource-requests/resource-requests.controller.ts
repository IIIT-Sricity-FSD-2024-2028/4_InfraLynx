import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ResourceRequestsService } from './resource-requests.service';
import { CreateResourceRequestDto, UpdateResourceRequestDto } from './resource-requests.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('resource-requests')
@UseGuards(RolesGuard)
export class ResourceRequestsController {
  constructor(private readonly svc: ResourceRequestsService) {}

  @Get() findAll(@Query('engineerId') engId?: string) {
    return engId ? this.svc.findByEngineer(engId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('ENGINEER') create(@Body() dto: CreateResourceRequestDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('ENGINEER', 'OFFICER', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateResourceRequestDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR', 'OFFICER', 'ENGINEER') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
