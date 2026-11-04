import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePsychologistDto {
  @IsOptional()
  @IsString()
  bio?: string;

  // verified / subscriptionActive NON sono qui di proposito: altrimenti uno
  // psicologo potrebbe auto-verificarsi o attivarsi senza pagare. Si cambiano
  // solo da PATCH /admin/psychologists/:id/verify e dal webhook Stripe.

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
