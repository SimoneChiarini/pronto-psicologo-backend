import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurato — email non inviata');
      return;
    }
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';
    const link = `${backendUrl}/auth/verify-email?token=${token}`;
    try {
      await this.resend.emails.send({
        from: 'ProntoPsicologo <onboarding@resend.dev>',
        to,
        subject: 'Conferma la tua email — Luminia Care',
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:40px 20px}
  .card{background:white;border-radius:16px;padding:40px;max-width:480px;margin:0 auto}
  h2{color:#1a1a2e;margin-top:0}
  p{color:#555;line-height:1.6}
  .btn{display:inline-block;padding:14px 28px;background:#1a1a2e;color:white;
       border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0}
  .footer{color:#aaa;font-size:12px;margin-top:24px}
</style></head>
<body>
  <div class="card">
    <h2>Benvenuto su Luminia Care!</h2>
    <p>Clicca il pulsante qui sotto per confermare il tuo indirizzo email e attivare l'account.</p>
    <a href="${link}" class="btn">Conferma email</a>
    <p class="footer">Il link scade tra 24 ore. Se non hai creato un account, ignora questa email.</p>
  </div>
</body>
</html>`,
      });
    } catch (e: any) {
      this.logger.error('Invio email fallito: ' + e.message);
    }
  }
}
