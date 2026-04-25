import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/roles.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ServiceCategoriesModule } from './modules/service-categories/service-categories.module';
import { RequestsModule } from './modules/requests/requests.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { IssueReportsModule } from './modules/issue-reports/issue-reports.module';
import { ResourceRequestsModule } from './modules/resource-requests/resource-requests.module';
import { ProgressReportsModule } from './modules/progress-reports/progress-reports.module';
import { BudgetProposalsModule } from './modules/budget-proposals/budget-proposals.module';
import { ProcurementBillsModule } from './modules/procurement-bills/procurement-bills.module';
import { QcReviewsModule } from './modules/qc-reviews/qc-reviews.module';
import { FundReleasesModule } from './modules/fund-releases/fund-releases.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { FieldAssetsModule } from './modules/field-assets/field-assets.module';
import { OutcomeReportsModule } from './modules/outcome-reports/outcome-reports.module';

@Module({
  imports: [
    DepartmentsModule,
    ServiceCategoriesModule,
    RequestsModule,
    WorkOrdersModule,
    QuotationsModule,
    InspectionsModule,
    IssueReportsModule,
    ResourceRequestsModule,
    ProgressReportsModule,
    BudgetProposalsModule,
    ProcurementBillsModule,
    QcReviewsModule,
    FundReleasesModule,
    MaintenanceModule,
    FieldAssetsModule,
    OutcomeReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule { }
