import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

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
