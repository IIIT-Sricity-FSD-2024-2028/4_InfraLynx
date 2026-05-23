import { IsString, IsOptional } from 'class-validator';

export class CreateResourceRequestDto {
  @IsString() departmentId: string;
  @IsOptional() @IsString() engineerId?: string;
  @IsString() item: string;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() urgency?: string;
  @IsOptional() @IsString() status?: string;
}
export class UpdateResourceRequestDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() urgency?: string;
  @IsOptional() @IsString() item?: string;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() engineerId?: string;
}
