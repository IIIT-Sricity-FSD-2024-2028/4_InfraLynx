import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateMaintenanceScheduleDto {
  @IsString() departmentId: string;
  @IsString() title: string;
  @IsString() frequency: string;
  @IsString() nextDate: string;
  @IsOptional() @IsString() assignee?: string;
}
export class UpdateMaintenanceScheduleDto {
  @IsOptional() @IsString() frequency?: string;
  @IsOptional() @IsString() nextDate?: string;
  @IsOptional() @IsString() assignee?: string;
}

export class CreateMaintenanceLogDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsOptional() @IsString() scheduleId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() title: string;
  @IsString() activity: string;
  @IsNumber() hoursSpent: number;
  @IsString() date: string;
  @IsString() status: string;
}
export class UpdateMaintenanceLogDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @IsNumber() hoursSpent?: number;
}
