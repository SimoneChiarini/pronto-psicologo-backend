import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  alboCode?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isMale?: boolean;

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
