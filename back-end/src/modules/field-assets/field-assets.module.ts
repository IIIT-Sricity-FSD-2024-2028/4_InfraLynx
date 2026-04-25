import { Module } from '@nestjs/common';
import { FieldAssetsController } from './field-assets.controller';
import { FieldAssetsService } from './field-assets.service';
@Module({ controllers: [FieldAssetsController], providers: [FieldAssetsService] })
export class FieldAssetsModule {}
