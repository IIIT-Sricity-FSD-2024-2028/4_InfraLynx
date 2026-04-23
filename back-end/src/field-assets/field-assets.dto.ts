import { IsString, IsOptional } from 'class-validator';

export class CreateSensorDeploymentDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() sensorType: string;
  @IsString() assetLocation: string;
  @IsString() serialNo: string;
  @IsString() status: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateSensorDeploymentDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}

export class CreateMaterialLogDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsOptional() @IsString() workOrderId?: string;
  @IsString() material: string;
  @IsString() quantity: string;
  @IsString() unit: string;
  @IsString() usedOn: string;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateMaterialLogDto {
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() notes?: string;
}
