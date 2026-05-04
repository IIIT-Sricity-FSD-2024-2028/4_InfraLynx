import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const stageValues = [
  'DRAFT',
  'PENDING_ADMIN_FORWARD',
  'PENDING_OFFICER_VERIFICATION',
  'PENDING_CFO_REVIEW',
  'APPROVED',
  'PARTIALLY_RELEASED',
  'FULLY_RELEASED',
  'REJECTED',
] as const;

export class CreateBudgetProposalDto {
  @IsString() departmentId: string;
  @IsString() title: string;
  @IsNumber() amountCr: number;
  @IsString() justification: string;
  @IsString() requestedBy: string;
  @IsOptional() @IsIn(stageValues) stage?: (typeof stageValues)[number];
}
export class UpdateBudgetProposalDto {
  @IsOptional() @IsIn(stageValues) stage?: (typeof stageValues)[number];
  @IsOptional() @IsNumber() amountCr?: number;
}
