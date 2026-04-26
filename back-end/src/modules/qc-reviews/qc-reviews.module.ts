import { Module } from '@nestjs/common';
import { QcReviewsController } from './qc-reviews.controller';
import { QcReviewsService } from './qc-reviews.service';
@Module({ controllers: [QcReviewsController], providers: [QcReviewsService] })
export class QcReviewsModule {}
