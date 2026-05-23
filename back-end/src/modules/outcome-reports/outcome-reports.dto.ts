import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const outcomeValues = ['SUCCESSFUL', 'PARTIALLY_SUCCESSFUL', 'UNSUCCESSFUL', 'PENDING'] as const;

export class CreateOutcomeReportDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsOptional() @IsString() preparedBy?: string;
  @IsString() title: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsNumber() budgetSanctioned?: number;
  @IsOptional() @IsNumber() budgetUsed?: number;
  @IsOptional() @IsIn(outcomeValues) outcome?: (typeof outcomeValues)[number];
  @IsOptional() @IsString() lessonsLearned?: string;
}
export class UpdateOutcomeReportDto {
  @IsOptional() @IsIn(outcomeValues) outcome?: (typeof outcomeValues)[number];
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() lessonsLearned?: string;
  @IsOptional() @IsNumber() budgetUsed?: number;
}
