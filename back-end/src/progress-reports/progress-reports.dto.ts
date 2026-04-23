import { IsString, IsOptional } from 'class-validator';

export class CreateProgressReportDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() title: string;
  @IsString() summary: string;
  @IsString() status: string;
}
export class UpdateProgressReportDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() summary?: string;
}
