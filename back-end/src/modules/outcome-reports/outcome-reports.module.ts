import { Module } from '@nestjs/common';
import { OutcomeReportsController } from './outcome-reports.controller';
import { OutcomeReportsService } from './outcome-reports.service';
import { WorkOrdersModule } from '../work-orders/work-orders.module';

@Module({
  imports: [WorkOrdersModule],
  controllers: [OutcomeReportsController],
  providers: [OutcomeReportsService],
  exports: [OutcomeReportsService],
})
export class OutcomeReportsModule {}
