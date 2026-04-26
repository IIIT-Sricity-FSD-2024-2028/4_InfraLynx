import { Module } from '@nestjs/common';
import { OutcomeReportsController } from './outcome-reports.controller';
import { OutcomeReportsService } from './outcome-reports.service';
@Module({ controllers: [OutcomeReportsController], providers: [OutcomeReportsService] })
export class OutcomeReportsModule {}
