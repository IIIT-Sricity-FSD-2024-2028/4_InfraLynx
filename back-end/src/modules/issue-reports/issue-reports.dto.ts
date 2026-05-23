import { IsString, IsOptional } from 'class-validator';

export class CreateIssueReportDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() locationText?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() status?: string;
}
export class UpdateIssueReportDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() locationText?: string;
  @IsOptional() @IsString() engineerId?: string;
}
