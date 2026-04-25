import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateOutcomeReportDto {
  @IsString() departmentId: string;
  @IsString() workOrderId: string;
  @IsString() preparedBy: string;
  @IsString() title: string;
  @IsString() summary: string;
  @IsNumber() budgetSanctioned: number;
  @IsNumber() budgetUsed: number;
  @IsString() outcome: string;
  @IsOptional() @IsString() lessonsLearned?: string;
}
export class UpdateOutcomeReportDto {
  @IsOptional() @IsString() outcome?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() lessonsLearned?: string;
}
