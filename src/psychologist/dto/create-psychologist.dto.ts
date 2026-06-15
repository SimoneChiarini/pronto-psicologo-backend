import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePsychologistDto {
  @IsString()
  userId: string;

  @IsString()
  alboCode: string;

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
  address?: string;

  @IsOptional() @IsBoolean() isMale?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagCodes?: string[];
}
