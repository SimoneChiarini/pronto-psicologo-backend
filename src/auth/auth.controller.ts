import { Controller, Post, Get, Patch, Body, Request, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('resend-verification-email')
  resendVerificationEmail(@Request() req) {
    return this.authService.resendVerificationEmail(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('location')
  updateLocation(@Request() req, @Body() body: { latitude: number; longitude: number }) {
    return this.authService.updateLocation(req.user.userId, body.latitude, body.longitude);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('fcm-token')
  updateFcmToken(@Request() req, @Body() body: { fcmToken: string }) {
    return this.authService.updateFcmToken(req.user.userId, body.fcmToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('fcm-token')
  getFcmToken(@Request() req) {
    return this.authService.getFcmToken(req.user.userId);
  }

  @SkipThrottle()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const ok = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:white;border-radius:16px;padding:40px;max-width:400px;text-align:center}
      h2{color:#1a1a2e}p{color:#555}
    </style></head><body><div class="card"><h2>Email verificata!</h2>
    <p>Il tuo account è attivo. Puoi tornare all'app e accedere.</p></div></body></html>`;
    const err = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body{font-family:Arial,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .card{background:white;border-radius:16px;padding:40px;max-width:400px;text-align:center}
      h2{color:#c0392b}p{color:#555}
    </style></head><body><div class="card"><h2>Link non valido</h2>
    <p>Il link è scaduto o già utilizzato. Richiedi una nuova email di verifica dall'app.</p></div></body></html>`;
    try {
      await this.authService.verifyEmail(token);
      res.setHeader('Content-Type', 'text/html').send(ok);
    } catch {
      res.status(400).setHeader('Content-Type', 'text/html').send(err);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  async verifyPhone(@Request() req, @Body() body: { firebaseToken: string }) {
    return this.authService.verifyPhone(req.user.userId, body.firebaseToken);
  }
}