import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Solo dati anagrafici. role/email/password NON sono modificabili da qui:
 * - role → altrimenti chiunque potrebbe promuoversi ADMIN
 * - email → richiederebbe una nuova verifica
 * - password → si cambia solo col flusso /auth/forgot-password (hash bcrypt)
 * Con forbidNonWhitelisted attivo, inviare questi campi dà 400.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImage?: string;
}
