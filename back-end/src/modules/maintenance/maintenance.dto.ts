import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateMaintenanceScheduleDto {
  @IsString() departmentId: string;
  @IsString() title: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() nextDate?: string;
  @IsOptional() @IsString() assignee?: string;
}
export class UpdateMaintenanceScheduleDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() nextDate?: string;
  @IsOptional() @IsString() assignee?: string;
}

export class CreateMaintenanceLogDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() scheduleId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() title: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @IsNumber() hoursSpent?: number;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() status?: string;
}
export class UpdateMaintenanceLogDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @IsNumber() hoursSpent?: number;
  @IsOptional() @IsString() date?: string;
}
