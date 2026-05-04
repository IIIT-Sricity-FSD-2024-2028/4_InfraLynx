import { Module } from '@nestjs/common';
import { QcReviewsController } from './qc-reviews.controller';
import { QcReviewsService } from './qc-reviews.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [WorkOrdersModule, RequestsModule],
  controllers: [QcReviewsController],
  providers: [QcReviewsService],
  exports: [QcReviewsService],
})
export class QcReviewsModule {}
