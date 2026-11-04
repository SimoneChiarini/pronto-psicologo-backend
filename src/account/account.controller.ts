import { Body, Controller, Header, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountService } from './account.service';
import { AccountExportService } from './account-export.service';

class PasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}

@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly exportService: AccountExportService,
  ) {}

  // POST invece di DELETE: alcuni proxy scartano il body delle DELETE
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('delete')
  @HttpCode(200)
  deleteAccount(@Body() body: PasswordDto, @Request() req) {
    return this.accountService.deleteAccount(req.user.userId, body.password);
  }

  // Export dati GDPR: POST con password perché contiene anche le conversazioni
  // (un token di sessione rubato da solo non basta per scaricare tutto)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('export')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  exportData(@Body() body: PasswordDto, @Request() req) {
    return this.exportService.export(req.user.userId, body.password);
  }
}
