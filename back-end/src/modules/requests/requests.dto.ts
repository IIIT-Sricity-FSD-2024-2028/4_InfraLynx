import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

const requestTypeValues = ['Complaint', 'Improvement'] as const;
const urgencyValues = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;
const requestStatusValues = [
  'RECEIVED',
  'UNDER_REVIEW',
  'APPROVED_FOR_PLANNING',
  'CONVERTED_TO_WORK_ORDER',
  'CLOSED',
  'REJECTED',
] as const;

export class CreateRequestDto {
  @IsOptional() @IsString() citizenAadhaar?: string;
  @IsIn(requestTypeValues) requestType: (typeof requestTypeValues)[number];
  @IsString() categoryId: string;
  @IsString() requesterName: string;
  @IsString() requesterContact: string;
  @IsEmail() requesterEmail: string;
  @IsString() title: string;
  @IsString() description: string;
  @IsString() locationText: string;
  @IsIn(urgencyValues) urgency: (typeof urgencyValues)[number];
}

export class UpdateRequestDto {
  @IsOptional() @IsIn(requestStatusValues) status?: (typeof requestStatusValues)[number];
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(urgencyValues) urgency?: (typeof urgencyValues)[number];
}

export class TrackRequestDto {
  @IsString() publicReferenceNo: string;
}
