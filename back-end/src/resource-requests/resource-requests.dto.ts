import { IsString, IsOptional } from 'class-validator';

export class CreateResourceRequestDto {
  @IsString() departmentId: string;
  @IsString() engineerId: string;
  @IsString() item: string;
  @IsString() quantity: string;
  @IsString() urgency: string;
  @IsString() status: string;
}
export class UpdateResourceRequestDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() urgency?: string;
}
