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
  @IsOptional() @IsBoolean() specAnsia?: boolean;
  @IsOptional() @IsBoolean() specUmore?: boolean;
  @IsOptional() @IsBoolean() specStress?: boolean;
  @IsOptional() @IsBoolean() specRelazioni?: boolean;
  @IsOptional() @IsBoolean() specCoppia?: boolean;
  @IsOptional() @IsBoolean() specGenitorialita?: boolean;
  @IsOptional() @IsBoolean() specInfanzia?: boolean;
  @IsOptional() @IsBoolean() specAutostima?: boolean;
  @IsOptional() @IsBoolean() specTrauma?: boolean;
  @IsOptional() @IsBoolean() specLutto?: boolean;
  @IsOptional() @IsBoolean() specSessualita?: boolean;
  @IsOptional() @IsBoolean() specDisturbiAlimentari?: boolean;
  @IsOptional() @IsBoolean() specDipendenze?: boolean;
  @IsOptional() @IsBoolean() specNeurodivergenze?: boolean;
}
