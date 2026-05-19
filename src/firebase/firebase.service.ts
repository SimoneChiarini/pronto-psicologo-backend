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
      const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      }
      this.messaging = admin.messaging();
      this.logger.log('Firebase Admin inizializzato');
    } catch (e: any) {
      this.logger.error('Firebase init fallito: ' + e.message);
    }
  }

  async sendToToken(token: string, title: string, body: string): Promise<void> {
    if (!this.messaging) return;
    try {
      await this.messaging.send({ token, notification: { title, body } });
    } catch (e: any) {
      this.logger.warn(`FCM invio fallito: ${e.message}`);
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
}
