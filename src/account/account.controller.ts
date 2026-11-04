import { Body, Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccountService } from './account.service';

class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}

@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  // POST invece di DELETE: alcuni proxy scartano il body delle DELETE
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('delete')
  @HttpCode(200)
  deleteAccount(@Body() body: DeleteAccountDto, @Request() req) {
    return this.accountService.deleteAccount(req.user.userId, body.password);
  }
}
