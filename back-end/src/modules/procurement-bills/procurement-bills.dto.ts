import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const billStatusValues = ['SUBMITTED', 'UNDER_VERIFICATION', 'APPROVED', 'REJECTED', 'PAID'] as const;

export class CreateProcurementBillDto {
  @IsString() departmentId: string;
  @IsString() vendor: string;
  @IsString() workOrderId: string;
  @IsNumber() amountLakhs: number;
  @IsBoolean() gstValid: boolean;
  @IsOptional() @IsIn(billStatusValues) status?: (typeof billStatusValues)[number];
}
export class UpdateProcurementBillDto {
  @IsOptional() @IsIn(billStatusValues) status?: (typeof billStatusValues)[number];
  @IsOptional() @IsBoolean() gstValid?: boolean;
}
