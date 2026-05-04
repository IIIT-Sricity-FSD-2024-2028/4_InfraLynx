import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const quotationStatusValues = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'] as const;

export class CreateQuotationDto {
  @IsString() departmentId: string;
  @IsString() vendor: string;
  @IsString() item: string;
  @IsNumber() amountLakhs: number;
  @IsBoolean() gstValid: boolean;
  @IsIn(quotationStatusValues) status: (typeof quotationStatusValues)[number];
}
export class UpdateQuotationDto {
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() item?: string;
  @IsOptional() @IsNumber() amountLakhs?: number;
  @IsOptional() @IsBoolean() gstValid?: boolean;
  @IsOptional() @IsIn(quotationStatusValues) status?: (typeof quotationStatusValues)[number];
}
