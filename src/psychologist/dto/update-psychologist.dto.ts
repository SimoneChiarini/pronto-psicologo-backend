import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePsychologistDto {
  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @IsBoolean()
  subscriptionActive?: boolean;

  @IsOptional()
  @IsBoolean()
  REM?: boolean;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

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
  phone?: string;

  @IsOptional() @IsBoolean() isMale?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagCodes?: string[];
}
