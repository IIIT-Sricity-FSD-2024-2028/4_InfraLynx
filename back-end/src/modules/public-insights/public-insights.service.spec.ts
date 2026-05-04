import { PublicInsightsService } from './public-insights.service';

describe('PublicInsightsService', () => {
  let service: PublicInsightsService;

  beforeEach(() => {
    service = new PublicInsightsService(
      { findAll: () => [] } as any,
      { findAll: () => [] } as any,
      { findAll: () => [] } as any,
      { findAll: () => [] } as any,
      { findAll: () => [] } as any,
      { findAll: () => [] } as any,
    );
  });

  it('exposes landing-page insight collections from the in-memory seed', () => {
    const result = service.findPublic();

    expect(result.meta.productName).toBe('InfraLynx');
    expect(result.publicStats.length).toBeGreaterThan(0);
    expect(result.impactStories.length).toBeGreaterThan(0);
    expect(result.activityFeed.length).toBeGreaterThan(0);
  });

  it('exposes admin insight collections that were previously frontend-only', () => {
    const result = service.findAdmin();

    expect(result.adminAlerts.length).toBeGreaterThan(0);
    expect(result.budgetSnapshots.length).toBeGreaterThan(0);
  });
});
