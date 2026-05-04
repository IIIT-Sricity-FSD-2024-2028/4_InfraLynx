import { IsIn, IsOptional, IsString } from 'class-validator';

const progressStatusValues = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'] as const;

export class CreateProgressReportDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() title: string;
  @IsString() summary: string;
  @IsIn(progressStatusValues) status: (typeof progressStatusValues)[number];
}
export class UpdateProgressReportDto {
  @IsOptional() @IsIn(progressStatusValues) status?: (typeof progressStatusValues)[number];
  @IsOptional() @IsString() summary?: string;
}
