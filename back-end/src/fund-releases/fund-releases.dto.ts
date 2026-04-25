import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFundReleaseDto {
  @IsString() departmentId: string;
  @IsString() proposalId: string;
  @IsString() title: string;
  @IsNumber() amountCr: number;
  @IsString() quarter: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateFundReleaseDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() releasedAt?: string;
  @IsOptional() @IsString() notes?: string;
}
