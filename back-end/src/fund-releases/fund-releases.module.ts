import { Module } from '@nestjs/common';
import { FundReleasesController } from './fund-releases.controller';
import { FundReleasesService } from './fund-releases.service';
@Module({ controllers: [FundReleasesController], providers: [FundReleasesService] })
export class FundReleasesModule {}
