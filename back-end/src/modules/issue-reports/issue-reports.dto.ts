import { IsString, IsOptional } from 'class-validator';

export class CreateIssueReportDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsString() title: string;
  @IsString() category: string;
  @IsString() locationText: string;
  @IsString() severity: string;
  @IsString() status: string;
}
export class UpdateIssueReportDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() severity?: string;
}
