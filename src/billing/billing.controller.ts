import { Controller, Get, Post, Req, Request, Headers, UseGuards } from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Request() req) {
    return this.billingService.getStatus(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckout(@Request() req) {
    return this.billingService.createCheckout(req.user.userId);
  }

  // Nessun JwtAuthGuard: chiamato da Stripe. Autenticato via firma sul raw body.
  @Post('webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleWebhook(signature, req.rawBody);
  }
}
