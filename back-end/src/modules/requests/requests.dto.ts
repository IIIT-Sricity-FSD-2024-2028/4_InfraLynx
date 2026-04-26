import { IsString, IsOptional } from 'class-validator';

export class CreateRequestDto {
  @IsString() citizenAadhaar: string;
  @IsString() requestType: string;
  @IsString() categoryId: string;
  @IsString() requesterName: string;
  @IsString() requesterContact: string;
  @IsString() requesterEmail: string;
  @IsString() title: string;
  @IsString() description: string;
  @IsString() locationText: string;
  @IsString() urgency: string;
}

export class UpdateRequestDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() urgency?: string;
}

export class TrackRequestDto {
  @IsString() publicReferenceNo: string;
}
