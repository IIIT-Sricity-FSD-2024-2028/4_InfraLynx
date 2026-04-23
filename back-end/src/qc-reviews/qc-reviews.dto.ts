import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateQcReviewDto {
  @IsString() departmentId: string;
  @IsString() workOrderId: string;
  @IsString() title: string;
  @IsString() reviewer: string;
  @IsString() finding: string;
  @IsString() status: string;
  @IsNumber() score: number;
}
export class UpdateQcReviewDto {
  @IsOptional() @IsString() finding?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsNumber() score?: number;
}
