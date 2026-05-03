import { ServiceCategoriesService } from './service-categories.service';

describe('ServiceCategoriesService', () => {
  let service: ServiceCategoriesService;

  beforeEach(() => {
    service = new ServiceCategoriesService();
  });

  it('keeps service categories available for in-memory request routing', () => {
    const categories = service.findAll();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories.some((category) => category.id === 'roads')).toBe(true);
  });
});
