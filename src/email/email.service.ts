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

  /**
   * Avviso agli admin di una nuova segnalazione. Volutamente NON include il testo
   * della segnalazione né i messaggi (dati potenzialmente sanitari): il dettaglio
   * si consulta solo nel pannello admin.
   */
  async sendReportNotification(
    to: string[],
    info: { reason: string; reporter: string; reported: string; openForReported: number },
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY non configurato — notifica segnalazione non inviata');
      return;
    }
    const esc = (v: string) =>
      v.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const repeated = info.openForReported > 1
      ? `<p style="color:#c0392b"><b>Attenzione:</b> ${info.openForReported} segnalazioni aperte su questo account.</p>`
      : '';
    try {
      await this.resend.emails.send({
        from: 'ProntoPsicologo <onboarding@resend.dev>',
        to,
        subject: `Nuova segnalazione: ${info.reason}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:40px 20px}
  .card{background:white;border-radius:16px;padding:40px;max-width:480px;margin:0 auto}
  h2{color:#1a1a2e;margin-top:0}
  p{color:#555;line-height:1.6}
  .footer{color:#aaa;font-size:12px;margin-top:24px}
</style></head>
<body>
  <div class="card">
    <h2>Nuova segnalazione</h2>
    <p><b>Motivo:</b> ${esc(info.reason)}<br>
       <b>Segnalato da:</b> ${esc(info.reporter)}<br>
       <b>Account segnalato:</b> ${esc(info.reported)}</p>
    ${repeated}
    <p>Apri il pannello admin → Segnalazioni per i dettagli e la conversazione.</p>
    <p class="footer">Email automatica di Luminia Care.</p>
  </div>
</body>
</html>`,
      });
    } catch (e: any) {
      this.logger.error('Invio email segnalazione fallito: ' + e.message);
    }
  }
}
