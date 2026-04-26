import { Module } from '@nestjs/common';
import { ProgressReportsController } from './progress-reports.controller';
import { ProgressReportsService } from './progress-reports.service';
@Module({ controllers: [ProgressReportsController], providers: [ProgressReportsService] })
export class ProgressReportsModule {}
