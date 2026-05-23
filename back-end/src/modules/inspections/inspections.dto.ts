import { IsString, IsOptional } from 'class-validator';

export class CreateInspectionDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() locationText?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() status?: string;
}
export class UpdateInspectionDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() locationText?: string;
  @IsOptional() @IsString() engineerId?: string;
}
