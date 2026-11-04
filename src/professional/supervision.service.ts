import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { CreateSupervisionDto, UpsertSupervisorProfileDto } from './dto/supervision.dto';
import { assertAnonymized } from './anonymization';
import { COLLEAGUE_SELECT, toColleague } from './peer.service';

/** Commissione della piattaforma sulle supervisioni (fissata su ogni richiesta). */
export const SUPERVISION_FEE_PERCENT = 10;

const feeFor = (amountCents: number, percent: number) => Math.round((amountCents * percent) / 100);

@Injectable()
export class SupervisionService {
  private readonly logger = new Logger(SupervisionService.name);

  constructor(private prisma: PrismaService, private billing: BillingService) {}

  // ── Profilo supervisore ───────────────────────────────────

  async getMyProfile(psychId: string) {
    let profile = await this.prisma.supervisorProfile.findUnique({ where: { psychologistId: psychId } });
    // Allinea lo stato Connect al ritorno dall'onboarding Stripe
    if (profile?.stripeAccountId && !profile.payoutsEnabled) {
      try {
        if (await this.billing.isConnectAccountReady(profile.stripeAccountId)) {
          profile = await this.prisma.supervisorProfile.update({
            where: { psychologistId: psychId },
            data: { payoutsEnabled: true },
          });
        }
      } catch (e: any) {
        this.logger.warn(`Verifica account Connect fallita: ${e.message}`);
      }
    }
    return profile ? this.profileView(profile) : null;
  }

  private profileView(p: {
    active: boolean; bio: string | null; orientation: string | null; yearsExperience: number | null;
    priceIndividualCents: number; pricePerParticipantCents: number; stripeAccountId: string | null; payoutsEnabled: boolean;
  }) {
    return {
      active: p.active,
      bio: p.bio,
      orientation: p.orientation,
      yearsExperience: p.yearsExperience,
      priceIndividualCents: p.priceIndividualCents,
      pricePerParticipantCents: p.pricePerParticipantCents,
      feePercent: SUPERVISION_FEE_PERCENT,
      paymentsSetUp: !!p.stripeAccountId,
      payoutsEnabled: p.payoutsEnabled,
    };
  }

  async upsertMyProfile(psychId: string, dto: UpsertSupervisorProfileDto) {
    const data = {
      active: dto.active,
      bio: dto.bio?.trim() || null,
      orientation: dto.orientation?.trim() || null,
      yearsExperience: dto.yearsExperience ?? null,
      priceIndividualCents: dto.priceIndividualCents,
      pricePerParticipantCents: dto.pricePerParticipantCents,
    };
    const p = await this.prisma.supervisorProfile.upsert({
      where: { psychologistId: psychId },
      update: data,
      create: { psychologistId: psychId, ...data },
    });
    return this.profileView(p);
  }

  async connectOnboarding(psychId: string, userId: string) {
    const profile = await this.prisma.supervisorProfile.findUnique({ where: { psychologistId: psychId } });
    if (!profile) throw new BadRequestException('Salva prima il tuo profilo da supervisore');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    try {
      const { accountId, url } = await this.billing.createConnectOnboardingLink(psychId, user.email, profile.stripeAccountId);
      if (accountId !== profile.stripeAccountId) {
        await this.prisma.supervisorProfile.update({ where: { psychologistId: psychId }, data: { stripeAccountId: accountId } });
      }
      return { url };
    } catch (e: any) {
      this.logger.error(`Onboarding Connect fallito: ${e.message}`);
      throw new ServiceUnavailableException('Non è stato possibile avviare la configurazione dei pagamenti. Riprova più tardi.');
    }
  }

  async connectDashboard(psychId: string) {
    const profile = await this.prisma.supervisorProfile.findUnique({ where: { psychologistId: psychId } });
    if (!profile?.stripeAccountId || !profile.payoutsEnabled) throw new BadRequestException('Pagamenti non ancora configurati');
    return { url: await this.billing.createConnectDashboardLink(profile.stripeAccountId) };
  }

  /** Supervisori disponibili: profilo attivo, pagamenti configurati, verificati con abbonamento. */
  async listSupervisors(psychId: string, q?: string) {
    const term = q?.trim();
    const rows = await this.prisma.supervisorProfile.findMany({
      where: {
        active: true,
        payoutsEnabled: true,
        psychologistId: { not: psychId },
        psychologist: {
          verified: true,
          subscriptionActive: true,
          ...(term ? { OR: [
            { user: { firstName: { contains: term, mode: 'insensitive' } } },
            { user: { lastName: { contains: term, mode: 'insensitive' } } },
          ] } : {}),
        },
      },
      include: {
        psychologist: {
          select: {
            ...COLLEAGUE_SELECT,
            bio: true,
            specializations: { select: { tagCode: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return rows.map(r => ({
      ...toColleague(r.psychologist),
      supervisorBio: r.bio ?? r.psychologist.bio,
      orientation: r.orientation,
      yearsExperience: r.yearsExperience,
      priceIndividualCents: r.priceIndividualCents,
      pricePerParticipantCents: r.pricePerParticipantCents,
      tagCodes: r.psychologist.specializations.map(s => s.tagCode),
    }));
  }

  // ── Richieste di supervisione ─────────────────────────────

  async create(psychId: string, dto: CreateSupervisionDto) {
    if (dto.supervisorId === psychId) throw new BadRequestException('Non puoi chiedere una supervisione a te stesso');
    assertAnonymized(dto.acknowledgeWarnings, dto.title, dto.caseSummary);

    const sup = await this.prisma.supervisorProfile.findFirst({
      where: {
        psychologistId: dto.supervisorId, active: true, payoutsEnabled: true,
        psychologist: { verified: true, subscriptionActive: true },
      },
    });
    if (!sup) throw new NotFoundException('Supervisore non disponibile');

    const colleagueIds = dto.mode === 'GROUP'
      ? [...new Set(dto.colleagueIds ?? [])].filter(id => id !== psychId && id !== dto.supervisorId)
      : [];
    if (dto.mode === 'INDIVIDUAL' && dto.colleagueIds?.length) {
      throw new BadRequestException('Una supervisione individuale non ha altri partecipanti');
    }
    if (colleagueIds.length) {
      const valid = await this.prisma.psychologist.count({
        where: { id: { in: colleagueIds }, verified: true, subscriptionActive: true },
      });
      if (valid !== colleagueIds.length) throw new BadRequestException('Alcuni colleghi invitati non sono disponibili');
    }

    // Limite membri: partecipanti + supervisore
    const settings = await this.prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const max = settings?.maxGroupMembers ?? 0;
    if (max > 0 && colleagueIds.length + 2 > max) {
      throw new ConflictException(`Il limite è di ${max} persone per stanza, supervisore incluso`);
    }

    const priceCents = dto.mode === 'INDIVIDUAL' ? sup.priceIndividualCents : sup.pricePerParticipantCents;
    const s = await this.prisma.supervision.create({
      data: {
        supervisorId: dto.supervisorId,
        createdById: psychId,
        mode: dto.mode,
        title: dto.title.trim(),
        caseSummary: dto.caseSummary.trim(),
        priceCents,
        feePercent: SUPERVISION_FEE_PERCENT,
        participants: {
          create: [
            { psychologistId: psychId, status: 'CONFIRMED' },
            ...colleagueIds.map(id => ({ psychologistId: id, status: 'INVITED' })),
          ],
        },
      },
    });
    return { id: s.id };
  }

  async list(psychId: string) {
    const include = {
      supervisor: { select: COLLEAGUE_SELECT },
      createdBy: { select: COLLEAGUE_SELECT },
      participants: { include: { psychologist: { select: COLLEAGUE_SELECT } } },
    } as const;
    const [asSupervisor, asParticipant] = await Promise.all([
      this.prisma.supervision.findMany({ where: { supervisorId: psychId }, include, orderBy: { createdAt: 'desc' } }),
      this.prisma.supervision.findMany({
        where: { participants: { some: { psychologistId: psychId, status: { not: 'DECLINED' } } } },
        include,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      asSupervisor: asSupervisor.map(s => this.view(s, psychId)),
      asParticipant: asParticipant.map(s => this.view(s, psychId)),
    };
  }

  async detail(id: string, psychId: string) {
    const s = await this.prisma.supervision.findUnique({
      where: { id },
      include: {
        supervisor: { select: COLLEAGUE_SELECT },
        createdBy: { select: COLLEAGUE_SELECT },
        participants: { include: { psychologist: { select: COLLEAGUE_SELECT } } },
      },
    });
    if (!s) throw new NotFoundException('Supervisione non trovata');
    const isSupervisor = s.supervisorId === psychId;
    const isParticipant = s.participants.some(p => p.psychologistId === psychId);
    if (!isSupervisor && !isParticipant) throw new NotFoundException('Supervisione non trovata');
    return { ...this.view(s, psychId), caseSummary: s.caseSummary };
  }

  private view(
    s: {
      id: string; mode: string; title: string; status: string; priceCents: number; feePercent: number;
      groupId: string | null; createdAt: Date; respondedAt: Date | null; completedAt: Date | null;
      supervisorId: string | null; createdById: string | null;
      supervisor: any; createdBy: any;
      participants: { psychologistId: string; status: string; paymentStatus: string; psychologist: any }[];
    },
    psychId: string,
  ) {
    const me = s.participants.find(p => p.psychologistId === psychId);
    const isSupervisor = s.supervisorId === psychId;
    const fee = feeFor(s.priceCents, s.feePercent);
    return {
      id: s.id, mode: s.mode, title: s.title, status: s.status,
      priceCents: s.priceCents,
      // Il supervisore vede il netto, il partecipante il prezzo che paga
      ...(isSupervisor ? { netPerParticipantCents: s.priceCents - fee, feePercent: s.feePercent } : {}),
      groupId: s.groupId,
      createdAt: s.createdAt, respondedAt: s.respondedAt, completedAt: s.completedAt,
      supervisor: toColleague(s.supervisor),
      createdBy: toColleague(s.createdBy),
      isSupervisor,
      isCreator: s.createdById === psychId,
      myStatus: me?.status ?? null,
      myPaymentStatus: me?.paymentStatus ?? null,
      // Accesso alla stanza: supervisore sempre (se accettata), partecipanti dopo il pagamento
      canEnterRoom: !!s.groupId && (isSupervisor || me?.paymentStatus === 'PAID'),
      participants: s.participants
        .filter(p => p.status !== 'DECLINED')
        .map(p => ({
          ...toColleague(p.psychologist),
          status: p.status,
          // Lo stato di pagamento altrui lo vede solo il supervisore
          ...(isSupervisor ? { paymentStatus: p.paymentStatus } : {}),
        })),
    };
  }

  /** Il supervisore accetta (crea la stanza privata) o rifiuta. */
  async respond(id: string, psychId: string, accept: boolean) {
    const s = await this.prisma.supervision.findUnique({ where: { id } });
    if (!s || s.supervisorId !== psychId) throw new NotFoundException('Supervisione non trovata');
    if (s.status !== 'REQUESTED') throw new BadRequestException('Hai già risposto a questa richiesta');

    if (!accept) {
      await this.prisma.supervision.update({ where: { id }, data: { status: 'DECLINED', respondedAt: new Date() } });
      return { status: 'DECLINED' };
    }

    await this.prisma.$transaction(async (tx) => {
      const group = await tx.peerGroup.create({
        data: {
          type: 'SUPERVISION',
          name: s.title,
          visibility: 'PRIVATE',
          createdById: psychId,
          members: {
            create: { psychologistId: psychId, role: 'SUPERVISOR', status: 'ACTIVE', confidentialityAcceptedAt: new Date() },
          },
          // La sintesi della richiesta diventa il primo caso della stanza
          cases: s.createdById ? {
            create: {
              authorId: s.createdById,
              title: s.title,
              presentingProblem: s.caseSummary,
              question: 'Richiesta di supervisione',
              anonymizationConfirmedAt: s.createdAt,
            },
          } : undefined,
        },
      });
      await tx.supervision.update({
        where: { id },
        data: { status: 'ACCEPTED', respondedAt: new Date(), groupId: group.id },
      });
    });
    return { status: 'ACCEPTED' };
  }

  /** Un collega invitato conferma o rifiuta la partecipazione (supervisione di gruppo). */
  async setParticipation(id: string, psychId: string, accept: boolean) {
    const seat = await this.prisma.supervisionParticipant.findUnique({
      where: { supervisionId_psychologistId: { supervisionId: id, psychologistId: psychId } },
      include: { supervision: { select: { status: true } } },
    });
    if (!seat) throw new NotFoundException('Supervisione non trovata');
    if (seat.paymentStatus === 'PAID') throw new BadRequestException('Hai già pagato la tua quota');
    if (!['REQUESTED', 'ACCEPTED'].includes(seat.supervision.status)) {
      throw new BadRequestException('Questa supervisione non è più aperta');
    }
    await this.prisma.supervisionParticipant.update({
      where: { supervisionId_psychologistId: { supervisionId: id, psychologistId: psychId } },
      data: { status: accept ? 'CONFIRMED' : 'DECLINED' },
    });
    return { status: accept ? 'CONFIRMED' : 'DECLINED' };
  }

  /** Checkout Stripe della propria quota; disponibile dopo l'accettazione del supervisore. */
  async checkout(id: string, psychId: string, userId: string) {
    const s = await this.prisma.supervision.findUnique({
      where: { id },
      include: {
        supervisor: { select: { supervisorProfile: { select: { stripeAccountId: true, payoutsEnabled: true } } } },
        participants: { where: { psychologistId: psychId } },
      },
    });
    const seat = s?.participants[0];
    if (!s || !seat) throw new NotFoundException('Supervisione non trovata');
    if (s.status !== 'ACCEPTED') throw new BadRequestException('Puoi pagare quando il supervisore ha accettato la richiesta');
    if (seat.status !== 'CONFIRMED') throw new BadRequestException('Conferma prima la tua partecipazione');
    if (seat.paymentStatus === 'PAID') throw new BadRequestException('Hai già pagato la tua quota');
    const dest = s.supervisor?.supervisorProfile;
    if (!dest?.stripeAccountId || !dest.payoutsEnabled) {
      throw new ServiceUnavailableException('Il supervisore non può ricevere pagamenti in questo momento');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const feeCents = feeFor(s.priceCents, s.feePercent);
    const { sessionId, url } = await this.billing.createSupervisionCheckout({
      supervisionId: s.id,
      payerPsychologistId: psychId,
      payerEmail: user.email,
      title: s.title,
      amountCents: s.priceCents,
      feeCents,
      destinationAccountId: dest.stripeAccountId,
    });
    await this.prisma.supervisionParticipant.update({
      where: { supervisionId_psychologistId: { supervisionId: id, psychologistId: psychId } },
      data: { paymentStatus: 'PENDING', stripeCheckoutSessionId: sessionId, amountCents: s.priceCents, feeCents },
    });
    return { url };
  }

  /** Il supervisore chiude la supervisione: la stanza resta leggibile ma archiviata. */
  async complete(id: string, psychId: string) {
    const s = await this.prisma.supervision.findUnique({ where: { id } });
    if (!s || s.supervisorId !== psychId) throw new NotFoundException('Supervisione non trovata');
    if (s.status !== 'ACCEPTED') throw new BadRequestException('Solo una supervisione in corso può essere conclusa');
    await this.prisma.$transaction([
      this.prisma.supervision.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date() } }),
      ...(s.groupId ? [this.prisma.peerGroup.update({ where: { id: s.groupId }, data: { archivedAt: new Date() } })] : []),
    ]);
    return { status: 'COMPLETED' };
  }

  /** Chi ha creato la richiesta può annullarla finché nessuno ha pagato. */
  async cancel(id: string, psychId: string) {
    const s = await this.prisma.supervision.findUnique({
      where: { id },
      include: { participants: { where: { paymentStatus: { in: ['PAID', 'PENDING'] } }, select: { psychologistId: true } } },
    });
    if (!s || s.createdById !== psychId) throw new NotFoundException('Supervisione non trovata');
    if (!['REQUESTED', 'ACCEPTED'].includes(s.status)) throw new BadRequestException('Questa supervisione non si può più annullare');
    if (s.participants.length) {
      throw new ForbiddenException('Ci sono già pagamenti: per annullare contatta l\'assistenza');
    }
    await this.prisma.$transaction([
      this.prisma.supervision.update({ where: { id }, data: { status: 'CANCELLED' } }),
      ...(s.groupId ? [this.prisma.peerGroup.update({ where: { id: s.groupId }, data: { archivedAt: new Date() } })] : []),
    ]);
    return { status: 'CANCELLED' };
  }
}
