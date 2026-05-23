import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const workOrderStatusValues = [
  'DRAFT',
  'PENDING_OFFICER_APPROVAL',
  'PENDING_ADMIN_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'PENDING_QC',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
] as const;

export class CreateWorkOrderDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() requestId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() locationText?: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsIn(workOrderStatusValues) status?: (typeof workOrderStatusValues)[number];
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isEmergency?: boolean;
}

export class UpdateWorkOrderDto {
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsIn(workOrderStatusValues) status?: (typeof workOrderStatusValues)[number];
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsString() approvedAt?: string;
  @IsOptional() @IsString() rejectedBy?: string;
  @IsOptional() @IsString() rejectedAt?: string;
  @IsOptional() @IsBoolean() qcPassed?: boolean;
}
