import { Module } from '@nestjs/common';
import { BudgetProposalsController } from './budget-proposals.controller';
import { BudgetProposalsService } from './budget-proposals.service';
@Module({
  controllers: [BudgetProposalsController],
  providers: [BudgetProposalsService],
  exports: [BudgetProposalsService],
})
export class BudgetProposalsModule {}
