import { IsString, IsOptional } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() requestId?: string;
  @IsString() title: string;
  @IsString() locationText: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsString() priority: string;
  @IsString() status: string;
  @IsString() dueDate: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateWorkOrderDto {
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() approvedBy?: string;
  @IsOptional() @IsString() approvedAt?: string;
  @IsOptional() @IsString() rejectedBy?: string;
  @IsOptional() @IsString() rejectedAt?: string;
}
