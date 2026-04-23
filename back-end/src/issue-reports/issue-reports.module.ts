import { Module } from '@nestjs/common';
import { IssueReportsController } from './issue-reports.controller';
import { IssueReportsService } from './issue-reports.service';
@Module({ controllers: [IssueReportsController], providers: [IssueReportsService], exports: [IssueReportsService] })
export class IssueReportsModule {}
