import { IsIn, IsOptional, IsString } from 'class-validator';

const progressStatusValues = ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'] as const;

export class CreateProgressReportDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsIn(progressStatusValues) status?: (typeof progressStatusValues)[number];
}
export class UpdateProgressReportDto {
  @IsOptional() @IsIn(progressStatusValues) status?: (typeof progressStatusValues)[number];
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() summary?: string;
}
