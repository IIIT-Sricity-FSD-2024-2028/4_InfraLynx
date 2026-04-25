import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateProcurementBillDto {
  @IsString() departmentId: string;
  @IsString() vendor: string;
  @IsString() workOrderId: string;
  @IsNumber() amountLakhs: number;
  @IsBoolean() gstValid: boolean;
  @IsOptional() @IsString() status?: string;
}
export class UpdateProcurementBillDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() gstValid?: boolean;
}
