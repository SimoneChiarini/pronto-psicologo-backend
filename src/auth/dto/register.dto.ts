import { IsArray, IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export const CONTRACT_VERSION = 'v1';
export const SUBSCRIPTION_PLANS = ['MONTHLY', 'ANNUAL'] as const;

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @IsIn(['USER', 'PSYCHOLOGIST'])
  role: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @ValidateIf((obj) => obj.role === 'PSYCHOLOGIST')
  @IsString()
  @IsNotEmpty()
  alboCode?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  isOnlineOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isPsychotherapist?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addresses?: string[];

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  isMale?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagCodes?: string[];

  @ValidateIf((obj) => obj.role === 'PSYCHOLOGIST')
  @IsString()
  @IsIn(SUBSCRIPTION_PLANS as unknown as string[])
  subscriptionPlan?: string;

  @ValidateIf((obj) => obj.role === 'PSYCHOLOGIST')
  @IsBoolean()
  contractAccepted?: boolean;
}
