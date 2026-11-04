import { IsEmail, IsHexadecimal, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  // Token da 32 byte in esadecimale, come generato in requestPasswordReset
  @IsHexadecimal()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(8, { message: 'La password deve avere almeno 8 caratteri' })
  @MaxLength(72, { message: 'La password può avere al massimo 72 caratteri' }) // limite bcrypt
  password: string;
}
