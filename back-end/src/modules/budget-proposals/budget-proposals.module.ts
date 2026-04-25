import { Module } from '@nestjs/common';
import { BudgetProposalsController } from './budget-proposals.controller';
import { BudgetProposalsService } from './budget-proposals.service';
@Module({ controllers: [BudgetProposalsController], providers: [BudgetProposalsService] })
export class BudgetProposalsModule {}
