import { Module } from '@nestjs/common';
import { FundReleasesController } from './fund-releases.controller';
import { FundReleasesService } from './fund-releases.service';
import { BudgetProposalsModule } from '../budget-proposals/budget-proposals.module';

@Module({
  imports: [BudgetProposalsModule],
  controllers: [FundReleasesController],
  providers: [FundReleasesService],
  exports: [FundReleasesService],
})
export class FundReleasesModule {}
