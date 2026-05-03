import { IsEmail, IsIn, IsOptional, IsString, IsBoolean } from 'class-validator';

export const officialRoleValues = [
  'ADMINISTRATOR',
  'OFFICER',
  'ENGINEER',
  'CFO',
  'QC_REVIEWER',
] as const;

export class OfficialDemoSignInDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsIn(officialRoleValues)
  role?: (typeof officialRoleValues)[number];
}

export class CitizenDemoSignInDto {
  @IsString()
  identifier: string;

  @IsString()
  password: string;
}

export class CitizenRegisterDto {
  @IsString() aadhaar: string;
  @IsString() name: string;
  @IsString() phone: string;
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() preferredLanguage?: string;
}

export class CreateOfficialAccountDto {
  @IsIn(officialRoleValues) role: (typeof officialRoleValues)[number];
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() departmentId?: string;
}

export class UpdateOfficialAccountDto {
  @IsOptional() @IsIn(officialRoleValues) role?: (typeof officialRoleValues)[number];
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() departmentId?: string;
}

export class OfficialLookupDto {
  @IsEmail() email: string;
}

export class CitizenLookupDto {
  @IsString() identifier: string;
}

export class ResetPasswordDto {
  @IsString() identifier: string;
  @IsString() password: string;
}
