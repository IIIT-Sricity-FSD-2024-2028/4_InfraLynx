import { Controller, Get } from '@nestjs/common';
import { PublicInsightsService } from './public-insights.service';

@Controller('public-insights')
export class PublicInsightsController {
  constructor(private readonly svc: PublicInsightsService) {}

  @Get()
  findPublic() {
    return this.svc.findPublic();
  }

  @Get('admin')
  findAdmin() {
    return this.svc.findAdmin();
  }

  @Get('activity')
  findActivity() {
    return this.svc.findActivity();
  }

  @Get('budget-snapshots')
  findBudgetSnapshots() {
    return this.svc.findBudgetSnapshots();
  }
}
