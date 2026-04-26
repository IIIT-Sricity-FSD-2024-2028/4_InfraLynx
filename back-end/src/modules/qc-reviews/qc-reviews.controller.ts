import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { QcReviewsService } from './qc-reviews.service';
import { CreateQcReviewDto, UpdateQcReviewDto } from './qc-reviews.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('qc-reviews')
@UseGuards(RolesGuard)
export class QcReviewsController {
  constructor(private readonly svc: QcReviewsService) {}

  @Get() findAll(@Query('workOrderId') woId?: string) {
    return woId ? this.svc.findByWorkOrder(woId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('QC_REVIEWER') create(@Body() dto: CreateQcReviewDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('QC_REVIEWER', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateQcReviewDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
