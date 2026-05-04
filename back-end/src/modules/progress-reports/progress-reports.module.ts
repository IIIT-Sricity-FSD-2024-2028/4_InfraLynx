import { Module } from '@nestjs/common';
import { ProgressReportsController } from './progress-reports.controller';
import { ProgressReportsService } from './progress-reports.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
})
export class ProgressReportsModule {}
