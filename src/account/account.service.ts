import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private prisma: PrismaService,
    private billing: BillingService,
    private storage: StorageService,
    private email: EmailService,
  ) {}

  /**
   * Cancellazione definitiva dell'account (diritto all'oblio, art. 17 GDPR).
   *
   * Ordine voluto:
   * 1. conferma password
   * 2. disdetta abbonamento Stripe — se fallisce ci si ferma: meglio un account
   *    non cancellato che un addebito su un account che non esiste più
   * 3. cancellazione DB in transazione (il resto va via a cascata: profilo
   *    psicologo, domande, risposte, conversazioni e messaggi, recensioni, post…)
   * 4. file su storage ed email di conferma, best-effort
   *
   * Le segnalazioni restano (FK SetNull) per non far sparire gli abusi.
   * Il cliente Stripe NON viene eliminato: fatture e pagamenti vanno conservati
   * per obblighi fiscali.
   */
  async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        firstName: true,
        profileImage: true,
        psychologist: {
          select: {
            stripeSubscriptionId: true,
            profileImage: true,
            coverImage: true,
            posts: { select: { imageUrl: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Account non trovato');
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Gli account amministratore non possono essere eliminati dall\'app');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Password non corretta');
    }

    const psych = user.psychologist;
    if (psych?.stripeSubscriptionId) {
      try {
        await this.billing.cancelSubscriptionNow(psych.stripeSubscriptionId);
      } catch (e: any) {
        this.logger.error(`Disdetta abbonamento fallita per user ${userId}: ${e.message}`);
        throw new ServiceUnavailableException(
          'Non è stato possibile disdire l\'abbonamento. Riprova tra qualche minuto o contatta l\'assistenza.',
        );
      }
    }

    const files = [
      user.profileImage,
      psych?.profileImage,
      psych?.coverImage,
      ...(psych?.posts.map(p => p.imageUrl) ?? []),
    ].filter((u): u is string => !!u);

    await this.prisma.$transaction([
      // Gli appuntamenti del cliente hanno userId SetNull: senza questo resterebbero
      // nell'agenda dello psicologo con le note scritte dal cliente
      this.prisma.appointment.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    void Promise.all([...new Set(files)].map(f => this.storage.deleteByUrl(f)));
    void this.email.sendAccountDeletedEmail(user.email, user.firstName);

    this.logger.log(`Account ${userId} (${user.role}) eliminato su richiesta dell'utente`);
    return { message: 'Account eliminato definitivamente.' };
  }
}
