import { Module } from '@nestjs/common';
import { PublicInsightsController } from './public-insights.controller';
import { PublicInsightsService } from './public-insights.service';
import { RequestsModule } from '../requests/requests.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { QcReviewsModule } from '../qc-reviews/qc-reviews.module';
import { OutcomeReportsModule } from '../outcome-reports/outcome-reports.module';
import { BudgetProposalsModule } from '../budget-proposals/budget-proposals.module';
import { FundReleasesModule } from '../fund-releases/fund-releases.module';

@Module({
  imports: [
    RequestsModule,
    WorkOrdersModule,
    QcReviewsModule,
    OutcomeReportsModule,
    BudgetProposalsModule,
    FundReleasesModule,
  ],
  controllers: [PublicInsightsController],
  providers: [PublicInsightsService],
})
export class PublicInsightsModule {}
