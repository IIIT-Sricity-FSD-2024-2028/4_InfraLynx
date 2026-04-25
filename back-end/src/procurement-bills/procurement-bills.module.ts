import { Module } from '@nestjs/common';
import { ProcurementBillsController } from './procurement-bills.controller';
import { ProcurementBillsService } from './procurement-bills.service';
@Module({ controllers: [ProcurementBillsController], providers: [ProcurementBillsService] })
export class ProcurementBillsModule {}
