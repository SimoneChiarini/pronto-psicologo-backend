import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

  constructor(private prisma: PrismaService) {}

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
        const psychId = session.metadata?.psychologistId;
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
        if (psychId) {
          await this.setSubscription(psychId, true, subscriptionId);
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

  private async setSubscription(psychologistId: string, active: boolean, subscriptionId: string | null) {
    await this.prisma.psychologist.update({
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
