import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

const releaseStatusValues = ['PENDING', 'RELEASED', 'WITHHELD', 'REJECTED'] as const;

export class CreateFundReleaseDto {
  @IsString() departmentId: string;
  @IsString() proposalId: string;
  @IsString() title: string;
  @IsNumber() amountCr: number;
  @IsString() quarter: string;
  @IsOptional() @IsIn(releaseStatusValues) status?: (typeof releaseStatusValues)[number];
  @IsOptional() @IsString() notes?: string;
}
export class UpdateFundReleaseDto {
  @IsOptional() @IsIn(releaseStatusValues) status?: (typeof releaseStatusValues)[number];
  @IsOptional() @IsString() releasedAt?: string;
  @IsOptional() @IsString() notes?: string;
}
