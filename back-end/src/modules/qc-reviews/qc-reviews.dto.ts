import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const qcStatusValues = ['UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const;

export class CreateQcReviewDto {
  @IsString() departmentId: string;
  @IsString() workOrderId: string;
  @IsString() title: string;
  @IsString() reviewer: string;
  @IsString() finding: string;
  @IsIn(qcStatusValues) status: (typeof qcStatusValues)[number];
  @IsNumber() score: number;
}
export class UpdateQcReviewDto {
  @IsOptional() @IsString() finding?: string;
  @IsOptional() @IsIn(qcStatusValues) status?: (typeof qcStatusValues)[number];
  @IsOptional() @IsNumber() score?: number;
}
