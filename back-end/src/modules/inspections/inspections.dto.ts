import { IsString, IsOptional } from 'class-validator';

export class CreateInspectionDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsString() title: string;
  @IsString() locationText: string;
  @IsString() severity: string;
  @IsString() dueDate: string;
  @IsString() status: string;
}
export class UpdateInspectionDto {
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() status?: string;
}
