import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../realtime/notification.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

  constructor(private prisma: PrismaService, private notifications: NotificationService) {}

  private get frontendUrl(): string {
    return process.env.FRONTEND_URL ?? 'http://localhost:8080';
  }

  private priceIdForPlan(plan: string | null): string | null {
    if (plan === 'ANNUAL') return process.env.STRIPE_PRICE_ANNUAL ?? null;
    // Default: mensile
    return process.env.STRIPE_PRICE_MONTHLY ?? null;
  }

  /** Stato abbonamento del professionista corrente (per l'UI). */
  async getStatus(userId: string) {
    const psych = await this.prisma.psychologist.findUnique({
      where: { userId },
      select: { id: true, verified: true, subscriptionActive: true, subscriptionPlan: true },
    });
    if (!psych) throw new NotFoundException('Profilo psicologo non trovato');
    return {
      verified: psych.verified ?? false,
      subscriptionActive: psych.subscriptionActive ?? false,
      subscriptionPlan: psych.subscriptionPlan ?? null,
    };
  }

  /**
   * Crea una sessione Stripe Checkout (subscription) e ritorna l'URL.
   * Consentito solo se l'albo è stato verificato e l'abbonamento non è già attivo.
   */
  async createCheckout(userId: string): Promise<{ url: string }> {
    const psych = await this.prisma.psychologist.findUnique({
      where: { userId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!psych) throw new NotFoundException('Profilo psicologo non trovato');
    if (!psych.verified) {
      throw new ForbiddenException('Il tuo albo non è ancora stato verificato. Riprova dopo la verifica.');
    }
    if (psych.subscriptionActive) {
      throw new BadRequestException('Hai già un abbonamento attivo');
    }

    // Config infrastrutturale verificata solo dopo le regole di business
    if (!this.stripe) {
      throw new InternalServerErrorException('Pagamenti non configurati (STRIPE_SECRET_KEY mancante)');
    }
    const priceId = this.priceIdForPlan(psych.subscriptionPlan);
    if (!priceId) {
      throw new InternalServerErrorException('Prezzo Stripe non configurato per il piano selezionato');
    }

    // Assicura un customer Stripe riutilizzabile
    let customerId = psych.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: psych.user.email,
        name: [psych.user.firstName, psych.user.lastName].filter(Boolean).join(' ') || undefined,
        metadata: { psychologistId: psych.id },
      });
      customerId = customer.id;
      await this.prisma.psychologist.update({
        where: { id: psych.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.frontendUrl}/?billing=success`,
      cancel_url: `${this.frontendUrl}/?billing=cancel`,
      metadata: { psychologistId: psych.id },
      subscription_data: { metadata: { psychologistId: psych.id } },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new InternalServerErrorException('Stripe non ha restituito un URL di pagamento');
    }
    return { url: session.url };
  }

  /** Gestisce gli eventi webhook di Stripe (verifica firma inclusa). */
  async handleWebhook(signature: string | undefined, rawBody: Buffer | undefined): Promise<{ received: boolean }> {
    if (!this.stripe) throw new InternalServerErrorException('Pagamenti non configurati');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET mancante');
    if (!signature || !rawBody) throw new BadRequestException('Firma o body webhook mancanti');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      this.logger.warn(`Firma webhook non valida: ${(err as Error).message}`);
      throw new BadRequestException('Firma webhook non valida');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Pagamento di una supervisione: NON è un abbonamento, va gestito a parte
        if (session.metadata?.kind === 'supervision') {
          if (session.payment_status === 'paid') await this.markSupervisionPaid(session);
          break;
        }
        const psychId = session.metadata?.psychologistId;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
        if (psychId) {
          await this.setSubscription(psychId, true, subscriptionId);
        }
        break;
      }
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.kind === 'supervision') await this.markSupervisionPaid(session);
        break;
      }
      case 'checkout.session.expired': {
        // Checkout abbandonato: il partecipante può riprovare
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.kind === 'supervision') {
          await this.prisma.supervisionParticipant.updateMany({
            where: { stripeCheckoutSessionId: session.id, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'UNPAID', stripeCheckoutSessionId: null },
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const active = sub.status === 'active' || sub.status === 'trialing';
        await this.setSubscriptionBySub(sub, active);
        break;
      }
      default:
        // eventi non gestiti: ignorati
        break;
    }
    return { received: true };
  }

  // ── Stripe Connect: pagamenti delle supervisioni ──────────

  private requireStripe(): Stripe {
    if (!this.stripe) throw new InternalServerErrorException('Pagamenti non configurati');
    return this.stripe;
  }

  private get frontendBase(): string {
    return this.frontendUrl.replace(/\/+$/, '');
  }

  /** Crea (se serve) l'account Connect Express del supervisore e ritorna il link di onboarding. */
  async createConnectOnboardingLink(psychologistId: string, email: string, existingAccountId: string | null) {
    const stripe = this.requireStripe();
    let accountId = existingAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'IT',
        email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
        business_profile: { product_description: 'Supervisione clinica per psicologi' },
        metadata: { psychologistId },
      });
      accountId = account.id;
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      refresh_url: `${this.frontendBase}/#/pro?connect=refresh`,
      return_url: `${this.frontendBase}/#/pro?connect=done`,
    });
    return { accountId, url: link.url };
  }

  /** true quando l'account Connect può ricevere pagamenti e bonifici. */
  async isConnectAccountReady(accountId: string): Promise<boolean> {
    const account = await this.requireStripe().accounts.retrieve(accountId);
    return account.charges_enabled === true && account.payouts_enabled === true;
  }

  /** Link alla dashboard Stripe Express del supervisore (incassi, bonifici, ricevute). */
  async createConnectDashboardLink(accountId: string): Promise<string> {
    const link = await this.requireStripe().accounts.createLoginLink(accountId);
    return link.url;
  }

  /**
   * Checkout di una supervisione (destination charge): il partecipante paga la
   * piattaforma, che trattiene la commissione e gira il resto al supervisore.
   */
  async createSupervisionCheckout(p: {
    supervisionId: string;
    payerPsychologistId: string;
    payerEmail: string;
    title: string;
    amountCents: number;
    feeCents: number;
    destinationAccountId: string;
  }) {
    const session = await this.requireStripe().checkout.sessions.create({
      mode: 'payment',
      customer_email: p.payerEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: p.amountCents,
          product_data: { name: `Supervisione: ${p.title}`.slice(0, 250) },
        },
      }],
      payment_intent_data: {
        application_fee_amount: p.feeCents,
        transfer_data: { destination: p.destinationAccountId },
        metadata: { kind: 'supervision', supervisionId: p.supervisionId, payerPsychologistId: p.payerPsychologistId },
      },
      metadata: { kind: 'supervision', supervisionId: p.supervisionId, payerPsychologistId: p.payerPsychologistId },
      success_url: `${this.frontendBase}/#/pro?supervision=${p.supervisionId}&payment=success`,
      cancel_url: `${this.frontendBase}/#/pro?supervision=${p.supervisionId}&payment=cancel`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 ora
    });
    if (!session.url) throw new InternalServerErrorException('Stripe non ha restituito un URL di pagamento');
    return { sessionId: session.id, url: session.url };
  }

  /**
   * Pagamento riuscito: segna il posto come pagato e fa entrare il partecipante
   * nella stanza di supervisione. Idempotente (Stripe può ripetere i webhook).
   */
  private async markSupervisionPaid(session: Stripe.Checkout.Session) {
    const supervisionId = session.metadata?.supervisionId;
    const psychologistId = session.metadata?.payerPsychologistId;
    if (!supervisionId || !psychologistId) return;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

    const seat = await this.prisma.supervisionParticipant.findUnique({
      where: { supervisionId_psychologistId: { supervisionId, psychologistId } },
      include: {
        supervision: { select: { groupId: true, supervisorId: true } },
        psychologist: { select: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!seat) {
      // Partecipante cancellato nel frattempo: il rimborso va fatto a mano
      this.logger.warn(`Pagamento supervisione ${supervisionId} senza posto (psych ${psychologistId}): valutare rimborso`);
      return;
    }
    if (seat.paymentStatus === 'PAID') return;

    await this.prisma.$transaction(async (tx) => {
      await tx.supervisionParticipant.update({
        where: { supervisionId_psychologistId: { supervisionId, psychologistId } },
        data: {
          paymentStatus: 'PAID',
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId ?? null,
          amountCents: session.amount_total ?? seat.amountCents,
        },
      });
      const groupId = seat.supervision.groupId;
      if (groupId) {
        await tx.peerGroupMember.upsert({
          where: { groupId_psychologistId: { groupId, psychologistId } },
          update: { status: 'ACTIVE' },
          create: { groupId, psychologistId, role: 'MEMBER', status: 'ACTIVE', confidentialityAcceptedAt: new Date() },
        });
      }
    });

    const payer = [seat.psychologist.user.firstName, seat.psychologist.user.lastName].filter(Boolean).join(' ') || 'Un collega';
    this.notifications.notifyPsychologists([seat.supervision.supervisorId], {
      type: 'supervision',
      title: 'Pagamento ricevuto',
      body: `${payer} ha pagato ed è entrato nella stanza di supervisione`,
      supervisionId,
    });
    this.notifications.notifyPsychologists([psychologistId], {
      type: 'supervision',
      title: 'Pagamento confermato',
      body: 'Ora puoi entrare nella stanza di supervisione',
      supervisionId,
    });
  }

  /**
   * Disdice subito l'abbonamento Stripe (usato alla cancellazione dell'account).
   * Lancia errore se Stripe non risponde: meglio bloccare la cancellazione che
   * continuare ad addebitare un account che non esiste più.
   */
  async cancelSubscriptionNow(subscriptionId: string): Promise<void> {
    if (!this.stripe) throw new InternalServerErrorException('Pagamenti non configurati');
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
    } catch (e: any) {
      // Già disdetto o inesistente: nessun addebito futuro, si può procedere
      if (e?.code === 'resource_missing') return;
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId).catch(() => null);
      if (sub?.status === 'canceled') return;
      throw e;
    }
  }

  private async setSubscription(psychologistId: string, active: boolean, subscriptionId: string | null) {
    // updateMany: se il profilo è stato cancellato nel frattempo non lanciare
    // errore (Stripe ritenterebbe il webhook all'infinito)
    await this.prisma.psychologist.updateMany({
      where: { id: psychologistId },
      data: {
        subscriptionActive: active,
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    });
  }

  /** Localizza il professionista da un oggetto Subscription (via metadata, poi customer). */
  private async setSubscriptionBySub(sub: Stripe.Subscription, active: boolean) {
    const psychId = sub.metadata?.psychologistId;
    if (psychId) {
      await this.setSubscription(psychId, active, sub.id);
      return;
    }
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) return;
    const psych = await this.prisma.psychologist.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
    if (psych) await this.setSubscription(psych.id, active, sub.id);
  }
}
