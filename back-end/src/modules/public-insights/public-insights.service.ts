import { Injectable } from '@nestjs/common';
import {
  activityFeed,
  adminAlerts,
  budgetSnapshots,
  impactStories,
  meta,
  publicStats,
} from '../../data/seed.data';
import { RequestsService } from '../requests/requests.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { QcReviewsService } from '../qc-reviews/qc-reviews.service';
import { OutcomeReportsService } from '../outcome-reports/outcome-reports.service';
import { BudgetProposalsService } from '../budget-proposals/budget-proposals.service';
import { FundReleasesService } from '../fund-releases/fund-releases.service';

@Injectable()
export class PublicInsightsService {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly qcReviewsService: QcReviewsService,
    private readonly outcomeReportsService: OutcomeReportsService,
    private readonly budgetProposalsService: BudgetProposalsService,
    private readonly fundReleasesService: FundReleasesService,
  ) {}

  private buildComputedPublicStats() {
    const requests = this.requestsService.findAll();
    const workOrders = this.workOrdersService.findAll();
    const qcReviews = this.qcReviewsService.findAll();
    const outcomes = this.outcomeReportsService.findAll();

    const received = requests.filter((request) => request.status === 'RECEIVED').length;
    const inReview = requests.filter((request) => request.status === 'UNDER_REVIEW').length;
    const planning = requests.filter((request) => request.status === 'APPROVED_FOR_PLANNING').length;
    const converted = requests.filter((request) => request.status === 'CONVERTED_TO_WORK_ORDER').length;
    const closed = requests.filter((request) => request.status === 'CLOSED').length;

    const pendingQc = workOrders.filter((order) => order.status === 'PENDING_QC').length;
    const completedOrders = workOrders.filter((order) => order.status === 'COMPLETED').length;
    const qcApproved = qcReviews.filter((review) => review.status === 'APPROVED').length;
    const successfulOutcomes = outcomes.filter((item) => item.outcome === 'SUCCESSFUL').length;

    return [
      { label: 'Requests received', value: received, detail: 'Citizen submissions captured in the intake system.' },
      { label: 'Requests under review', value: inReview, detail: 'Requests currently in administrator feasibility review.' },
      { label: 'Planning-ready requests', value: planning, detail: 'Requests approved to move into department planning.' },
      { label: 'Requests converted to work orders', value: converted, detail: 'Cases currently mapped into executable work orders.' },
      { label: 'Closed requests', value: closed, detail: 'Citizen requests closed after verified completion.' },
      { label: 'Work orders awaiting QC', value: pendingQc, detail: 'Execution-complete jobs waiting for quality certification.' },
      { label: 'Work orders completed', value: completedOrders, detail: 'Work orders that passed completion and closure checks.' },
      { label: 'QC approvals issued', value: qcApproved, detail: 'Quality approvals recorded by QC reviewers.' },
      { label: 'Successful closure reports', value: successfulOutcomes, detail: 'Outcome reports marked as successful.' },
    ];
  }

  private buildComputedAdminAlerts() {
    const requests = this.requestsService.findAll();
    const workOrders = this.workOrdersService.findAll();
    const pendingBudget = this.budgetProposalsService.findAll().filter((proposal) => proposal.stage === 'PENDING_CFO_REVIEW').length;
    const pendingReleases = this.fundReleasesService.findAll().filter((release) => release.status === 'PENDING').length;

    return [
      {
        tone: 'warning',
        label: 'Request intake',
        title: `${requests.filter((request) => request.status === 'RECEIVED').length} requests awaiting first review`,
        detail: 'City Administrator should move new citizen requests into UNDER_REVIEW to keep intake current.',
      },
      {
        tone: 'warning',
        label: 'Execution',
        title: `${workOrders.filter((order) => order.status === 'PENDING_QC').length} work orders are waiting for QC certification`,
        detail: 'QC completion is required before citizen closure can be published.',
      },
      {
        tone: pendingBudget > 0 ? 'warning' : 'neutral',
        label: 'Finance',
        title: `${pendingBudget} budget proposals pending CFO review`,
        detail: `${pendingReleases} fund releases are in PENDING status and may block execution.`,
      },
    ];
  }

  private buildComputedImpactStories() {
    const outcomes = this.outcomeReportsService.findAll()
      .filter((item) => item.outcome && item.outcome !== 'PENDING')
      .slice(0, 3);

    if (!outcomes.length) {
      return impactStories;
    }

    return outcomes.map((outcome) => ({
      id: outcome.id,
      title: outcome.title,
      copy: outcome.summary,
      outcome: outcome.outcome,
      budgetUsed: outcome.budgetUsed,
    }));
  }

  findPublic() {
    const computedStats = this.buildComputedPublicStats();
    return {
      meta,
      publicStats: computedStats.length ? computedStats : publicStats,
      impactStories: this.buildComputedImpactStories(),
      activityFeed: activityFeed.slice(0, 5),
    };
  }

  findAdmin() {
    const computedAlerts = this.buildComputedAdminAlerts();
    return {
      meta,
      adminAlerts: computedAlerts.length ? computedAlerts : adminAlerts,
      budgetSnapshots,
      activityFeed,
    };
  }

  findActivity() {
    return activityFeed;
  }

  findBudgetSnapshots() {
    return budgetSnapshots;
  }
}
