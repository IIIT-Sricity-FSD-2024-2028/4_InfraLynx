import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  name: string;

  @IsString()
  publicLabel: string;

  @IsString()
  lead: string;

  @IsNumber()
  @Min(0)
  budgetCr: number;

  @IsNumber()
  @Min(0)
  utilization: number;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() publicLabel?: string;
  @IsOptional() @IsString() lead?: string;
  @IsOptional() @IsNumber() @Min(0) budgetCr?: number;
  @IsOptional() @IsNumber() @Min(0) utilization?: number;
}
