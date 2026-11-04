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
    const user = await this.loadForDeletion(userId);
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Gli account amministratore non possono essere eliminati dall\'app');
    }
    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException('Password non corretta');
    }
    await this.purge(user, 'self');
    return { message: 'Account eliminato definitivamente.' };
  }

  /**
   * Cancellazione da parte di un admin: stessa procedura (disdetta Stripe,
   * cascata, file), senza password dell'utente. Non si possono eliminare
   * altri admin né sé stessi.
   */
  async deleteByAdmin(adminUserId: string, targetUserId: string): Promise<{ message: string }> {
    if (adminUserId === targetUserId) throw new ForbiddenException('Non puoi eliminare il tuo account');
    const user = await this.loadForDeletion(targetUserId);
    if (user.role === 'ADMIN') throw new ForbiddenException('Gli account amministratore non possono essere eliminati');
    await this.purge(user, 'admin', adminUserId);
    return { message: 'Account eliminato definitivamente.' };
  }

  /** Come deleteByAdmin, partendo dall'id del profilo psicologo. */
  async deletePsychologistByAdmin(adminUserId: string, psychologistId: string) {
    const psych = await this.prisma.psychologist.findUnique({
      where: { id: psychologistId },
      select: { userId: true },
    });
    if (!psych) throw new NotFoundException('Psicologo non trovato');
    return this.deleteByAdmin(adminUserId, psych.userId);
  }

  private async loadForDeletion(userId: string) {
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
    return user;
  }

  private async purge(
    user: Awaited<ReturnType<AccountService['loadForDeletion']>>,
    by: 'self' | 'admin',
    adminUserId?: string,
  ): Promise<void> {
    const userId = user.id;
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
    void this.email.sendAccountDeletedEmail(user.email, user.firstName, by === 'admin');

    this.logger.log(
      by === 'admin'
        ? `Account ${userId} (${user.role}) eliminato dall'admin ${adminUserId}`
        : `Account ${userId} (${user.role}) eliminato su richiesta dell'utente`,
    );
  }
}
