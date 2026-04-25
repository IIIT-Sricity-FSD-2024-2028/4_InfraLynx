import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { FundReleasesService } from './fund-releases.service';
import { CreateFundReleaseDto, UpdateFundReleaseDto } from './fund-releases.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('fund-releases')
@UseGuards(RolesGuard)
export class FundReleasesController {
  constructor(private readonly svc: FundReleasesService) {}

  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('CFO', 'ADMINISTRATOR') create(@Body() dto: CreateFundReleaseDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('CFO', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateFundReleaseDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
