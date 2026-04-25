import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateBudgetProposalDto {
  @IsString() departmentId: string;
  @IsString() title: string;
  @IsNumber() amountCr: number;
  @IsString() justification: string;
  @IsString() requestedBy: string;
  @IsOptional() @IsString() stage?: string;
}
export class UpdateBudgetProposalDto {
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsNumber() amountCr?: number;
}
