import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const outcomeValues = ['SUCCESSFUL', 'PARTIALLY_SUCCESSFUL', 'UNSUCCESSFUL', 'PENDING'] as const;

export class CreateOutcomeReportDto {
  @IsString() departmentId: string;
  @IsString() workOrderId: string;
  @IsString() preparedBy: string;
  @IsString() title: string;
  @IsString() summary: string;
  @IsNumber() budgetSanctioned: number;
  @IsNumber() budgetUsed: number;
  @IsIn(outcomeValues) outcome: (typeof outcomeValues)[number];
  @IsOptional() @IsString() lessonsLearned?: string;
}
export class UpdateOutcomeReportDto {
  @IsOptional() @IsIn(outcomeValues) outcome?: (typeof outcomeValues)[number];
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() lessonsLearned?: string;
}
