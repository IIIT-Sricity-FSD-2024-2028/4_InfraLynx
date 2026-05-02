import { Module } from '@nestjs/common';
import { PublicInsightsController } from './public-insights.controller';
import { PublicInsightsService } from './public-insights.service';

@Module({
  controllers: [PublicInsightsController],
  providers: [PublicInsightsService],
})
export class PublicInsightsModule {}
