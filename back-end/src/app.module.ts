import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/roles.guard';

import { DepartmentsModule } from './departments/departments.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { RequestsModule } from './requests/requests.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { QuotationsModule } from './quotations/quotations.module';
import { InspectionsModule } from './inspections/inspections.module';
import { IssueReportsModule } from './issue-reports/issue-reports.module';
import { ResourceRequestsModule } from './resource-requests/resource-requests.module';
import { ProgressReportsModule } from './progress-reports/progress-reports.module';
import { BudgetProposalsModule } from './budget-proposals/budget-proposals.module';
import { ProcurementBillsModule } from './procurement-bills/procurement-bills.module';
import { QcReviewsModule } from './qc-reviews/qc-reviews.module';
import { FundReleasesModule } from './fund-releases/fund-releases.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { FieldAssetsModule } from './field-assets/field-assets.module';
import { OutcomeReportsModule } from './outcome-reports/outcome-reports.module';

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
  // Register RolesGuard globally so every module inherits RBAC
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
