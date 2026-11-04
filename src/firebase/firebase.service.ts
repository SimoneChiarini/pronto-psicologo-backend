import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private messaging: admin.messaging.Messaging | null = null;

  constructor() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT non impostato — notifiche push disabilitate');
      return;
    }
    try {
      const serviceAccount = FirebaseService.parseServiceAccount(raw) as admin.ServiceAccount;
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      this.messaging = admin.messaging();
      this.logger.log('Firebase Admin inizializzato');
    } catch (e: any) {
      this.logger.error('Firebase init fallito: ' + e.message);
    }
  }

  /**
   * Accetta il JSON del service account anche nelle forme in cui finisce spesso
   * nelle variabili d'ambiente dei pannelli di hosting: tra virgolette, senza
   * graffe esterne (errore "position 6" visto su Railway) o codificato in base64.
   */
  static parseServiceAccount(raw: string): Record<string, unknown> {
    let v = raw.trim();
    if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"{') && v.endsWith('}"'))) v = v.slice(1, -1);
    if (!v.startsWith('{') && !v.startsWith('"') && /^[A-Za-z0-9+/=\s]+$/.test(v)) {
      v = Buffer.from(v, 'base64').toString('utf8').trim();
    }
    if (v.startsWith('"type"')) v = `{${v.replace(/,\s*$/, '')}}`;
    const parsed = JSON.parse(v);
    if (typeof parsed.private_key === 'string') {
      // Alcuni pannelli raddoppiano gli escape: "\\n" → a capo vero
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  /**
   * Invia una push. Ritorna false se il token non è più valido (app disinstallata,
   * permesso revocato): il chiamante può cancellarlo.
   */
  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
    if (!this.messaging) return true;
    try {
      await this.messaging.send({
        token,
        notification: { title, body },
        data,
        webpush: { fcmOptions: { link: process.env.FRONTEND_URL?.replace(/\/+$/, '') || undefined } },
      });
      return true;
    } catch (e: any) {
      const code = e?.errorInfo?.code ?? e?.code;
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
        return false;
      }
      this.logger.warn(`FCM invio fallito: ${e.message}`);
      return true;
    }
  }

  async sendToTokens(tokens: string[], title: string, body: string): Promise<void> {
    if (!this.messaging || tokens.length === 0) return;
    try {
      await this.messaging.sendEachForMulticast({ tokens, notification: { title, body } });
    } catch (e: any) {
      this.logger.warn(`FCM multicast fallito: ${e.message}`);
    }
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
    if (!admin.apps.length) return null;
    try {
      return await admin.auth().verifyIdToken(token);
    } catch {
      return null;
    }
  }
}
