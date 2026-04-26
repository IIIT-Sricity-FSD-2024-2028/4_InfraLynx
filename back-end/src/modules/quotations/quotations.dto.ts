import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateQuotationDto {
  @IsString() departmentId: string;
  @IsString() vendor: string;
  @IsString() item: string;
  @IsNumber() amountLakhs: number;
  @IsBoolean() gstValid: boolean;
  @IsString() status: string;
}
export class UpdateQuotationDto {
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsString() item?: string;
  @IsOptional() @IsNumber() amountLakhs?: number;
  @IsOptional() @IsBoolean() gstValid?: boolean;
  @IsOptional() @IsString() status?: string;
}
