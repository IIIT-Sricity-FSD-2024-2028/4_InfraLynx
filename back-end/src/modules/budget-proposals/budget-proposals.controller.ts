import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { BudgetProposalsService } from './budget-proposals.service';
import { CreateBudgetProposalDto, UpdateBudgetProposalDto } from './budget-proposals.dto';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';

@Controller('budget-proposals')
@UseGuards(RolesGuard)
export class BudgetProposalsController {
  constructor(private readonly svc: BudgetProposalsService) {}

  @Get() findAll(@Query('departmentId') deptId?: string) {
    return deptId ? this.svc.findByDepartment(deptId) : this.svc.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @Roles('OFFICER', 'CFO', 'ADMINISTRATOR') create(@Body() dto: CreateBudgetProposalDto) { return this.svc.create(dto); }
  @Patch(':id') @Roles('CFO', 'ADMINISTRATOR') update(@Param('id') id: string, @Body() dto: UpdateBudgetProposalDto) { return this.svc.update(id, dto); }
  @Delete(':id') @Roles('CFO', 'ADMINISTRATOR') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
