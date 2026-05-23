import { IsString, IsOptional } from 'class-validator';

export class CreateSensorDeploymentDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() sensorType: string;
  @IsOptional() @IsString() assetLocation?: string;
  @IsOptional() @IsString() serialNo?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateSensorDeploymentDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() sensorType?: string;
  @IsOptional() @IsString() assetLocation?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateMaterialLogDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() material: string;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() usedOn?: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateMaterialLogDto {
  @IsOptional() @IsString() material?: string;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() usedOn?: string;
  @IsOptional() @IsString() notes?: string;
}
