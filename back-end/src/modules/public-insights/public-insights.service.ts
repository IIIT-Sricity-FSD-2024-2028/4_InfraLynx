import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { meta, activityFeed, impactStories, publicStats, adminAlerts, budgetSnapshots } from '../../data/seed.data';
import { RequestsService } from '../requests/requests.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { QcReviewsService } from '../qc-reviews/qc-reviews.service';
import { OutcomeReportsService } from '../outcome-reports/outcome-reports.service';
import { BudgetProposalsService } from '../budget-proposals/budget-proposals.service';
import { FundReleasesService } from '../fund-releases/fund-releases.service';

@Injectable()
export class PublicInsightsService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly requestsService: RequestsService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly qcReviewsService: QcReviewsService,
    private readonly outcomeReportsService: OutcomeReportsService,
    private readonly budgetProposalsService: BudgetProposalsService,
    private readonly fundReleasesService: FundReleasesService,
  ) {}

  private async buildComputedPublicStats() {
    const requests = await this.requestsService.findAll();
    const workOrders = await this.workOrdersService.findAll();
    const qcReviews = await this.qcReviewsService.findAll();
    const outcomes = await this.outcomeReportsService.findAll();

    return [
      { label: 'Requests received', value: requests.filter(r => r.status === 'RECEIVED').length, detail: 'Citizen submissions captured in the intake system.' },
      { label: 'Requests under review', value: requests.filter(r => r.status === 'UNDER_REVIEW').length, detail: 'Requests currently in administrator feasibility review.' },
      { label: 'Planning-ready requests', value: requests.filter(r => r.status === 'APPROVED_FOR_PLANNING').length, detail: 'Requests approved to move into department planning.' },
      { label: 'Requests converted to work orders', value: requests.filter(r => r.status === 'CONVERTED_TO_WORK_ORDER').length, detail: 'Cases currently mapped into executable work orders.' },
      { label: 'Closed requests', value: requests.filter(r => r.status === 'CLOSED').length, detail: 'Citizen requests closed after verified completion.' },
      { label: 'Work orders awaiting QC', value: workOrders.filter(o => o.status === 'PENDING_QC').length, detail: 'Execution-complete jobs waiting for quality certification.' },
      { label: 'Work orders completed', value: workOrders.filter(o => o.status === 'COMPLETED').length, detail: 'Work orders that passed completion and closure checks.' },
      { label: 'QC approvals issued', value: qcReviews.filter(r => r.status === 'APPROVED').length, detail: 'Quality approvals recorded by QC reviewers.' },
      { label: 'Successful closure reports', value: outcomes.filter(o => o.outcome === 'SUCCESSFUL').length, detail: 'Outcome reports marked as successful.' },
    ];
  }

  private async buildComputedAdminAlerts() {
    const requests = await this.requestsService.findAll();
    const workOrders = await this.workOrdersService.findAll();
    const pendingBudget = (await this.budgetProposalsService.findAll()).filter(p => p.stage === 'PENDING_CFO_REVIEW').length;
    const pendingReleases = (await this.fundReleasesService.findAll()).filter(r => r.status === 'PENDING').length;

    return [
      { tone: 'warning', label: 'Request intake', title: `${requests.filter(r => r.status === 'RECEIVED').length} requests awaiting first review`, detail: 'City Administrator should move new citizen requests into UNDER_REVIEW to keep intake current.' },
      { tone: 'warning', label: 'Execution', title: `${workOrders.filter(o => o.status === 'PENDING_QC').length} work orders are waiting for QC certification`, detail: 'QC completion is required before citizen closure can be published.' },
      { tone: pendingBudget > 0 ? 'warning' : 'neutral', label: 'Finance', title: `${pendingBudget} budget proposals pending CFO review`, detail: `${pendingReleases} fund releases are in PENDING status and may block execution.` },
    ];
  }

  private async buildComputedBudgetSnapshots() {
    const { rows } = await this.db.query(`
      SELECT d.id as department_id, d.name, d.budget_cr as allocated_cr,
             COALESCE(SUM(CASE WHEN fr.status='RELEASED' THEN fr.amount_cr ELSE 0 END),0) as spent_cr
      FROM departments d
      LEFT JOIN budget_proposals bp ON bp.department_id = d.id
      LEFT JOIN fund_releases fr ON fr.proposal_id = bp.id
      GROUP BY d.id, d.name, d.budget_cr
      ORDER BY d.name
    `);
    if (!rows.length) return budgetSnapshots;
    return rows.map(r => ({
      departmentId: r.department_id,
      departmentName: r.name,
      allocatedCr: parseFloat(r.allocated_cr) || 0,
      spentCr: parseFloat(r.spent_cr) || 0,
    }));
  }

  async findPublic() {
    const computedStats = await this.buildComputedPublicStats();
    const outcomes = await this.outcomeReportsService.findAll();
    const computedStories = outcomes.filter(o => o.outcome && o.outcome !== 'PENDING').slice(0, 3);
    const impactStoriesToUse = computedStories.length
      ? computedStories.map(o => ({ id: o.id, title: o.title, copy: o.summary, outcome: o.outcome, budgetUsed: o.budgetUsed }))
      : impactStories;
    return {
      meta,
      publicStats: computedStats.length ? computedStats : publicStats,
      impactStories: impactStoriesToUse,
      activityFeed: activityFeed.slice(0, 5),
    };
  }

  async findAdmin() {
    const computedAlerts = await this.buildComputedAdminAlerts();
    const snapshots = await this.buildComputedBudgetSnapshots();
    return { meta, adminAlerts: computedAlerts.length ? computedAlerts : adminAlerts, budgetSnapshots: snapshots, activityFeed };
  }

  findActivity() {
    return activityFeed;
  }

  async findBudgetSnapshots() {
    return this.buildComputedBudgetSnapshots();
  }
}
