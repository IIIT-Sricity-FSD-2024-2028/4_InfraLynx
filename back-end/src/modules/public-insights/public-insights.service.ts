import { Injectable } from '@nestjs/common';
import {
  activityFeed,
  adminAlerts,
  budgetSnapshots,
  impactStories,
  meta,
  publicStats,
} from '../../data/seed.data';

@Injectable()
export class PublicInsightsService {
  findPublic() {
    return {
      meta,
      publicStats,
      impactStories,
      activityFeed: activityFeed.slice(0, 5),
    };
  }

  findAdmin() {
    return {
      meta,
      adminAlerts,
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
