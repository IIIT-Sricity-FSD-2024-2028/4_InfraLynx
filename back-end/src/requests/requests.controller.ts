import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto, UpdateRequestDto } from './requests.dto';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@Controller('requests')
@UseGuards(RolesGuard)
export class RequestsController {
  constructor(private readonly svc: RequestsService) {}

  /** GET /requests?aadhaar=xxx — Public or citizen can filter by aadhaar */
  @Get() findAll(@Query('aadhaar') aadhaar?: string) {
    if (aadhaar) return this.svc.findByAadhaar(aadhaar);
    return this.svc.findAll();
  }

  /** GET /requests/track?ref=CRIMS-2026-0042 — Public tracking */
  @Get('track') track(@Query('ref') ref: string) { return this.svc.findByRef(ref); }

  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  /** POST /requests — Citizens and public submit requests */
  @Post() create(@Body() dto: CreateRequestDto) { return this.svc.create(dto); }

  /** PATCH /requests/:id — Admin or Officer can update status */
  @Patch(':id') @Roles('ADMINISTRATOR', 'OFFICER') update(@Param('id') id: string, @Body() dto: UpdateRequestDto) { return this.svc.update(id, dto); }

  /** DELETE /requests/:id — Administrator only */
  @Delete(':id') @Roles('ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
