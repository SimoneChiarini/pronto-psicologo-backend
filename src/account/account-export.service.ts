import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { REPORT_REASONS, ReportReason } from '../report/report.constants';
import { TAG_LABEL_MAP } from '../specialization/taxonomy';

const EXPORT_VERSION = 1;

type Named = { firstName: string | null; lastName: string | null } | null | undefined;
const fullName = (u: Named) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || null;

/**
 * Export dei dati personali (diritto di accesso e portabilità, artt. 15 e 20 GDPR).
 *
 * Include tutto ciò che l'utente ha fornito o che lo riguarda direttamente.
 * Esclusi di proposito:
 * - password (hash), token di verifica/reset, token FCM → segreti tecnici
 * - id interni Stripe e controlli automatici albo → dati operativi interni
 * - segnalazioni RICEVUTE → rivelerebbero chi ha segnalato (diritti di terzi);
 *   sono incluse solo quelle inviate dall'utente
 * - dei terzi (l'altra parte di una conversazione, chi lascia una recensione)
 *   solo il nome, già visibile nell'app
 */
@Injectable()
export class AccountExportService {
  private readonly logger = new Logger(AccountExportService.name);

  constructor(private prisma: PrismaService) {}

  async export(userId: string, password: string) {
    const auth = await this.prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!auth) throw new NotFoundException('Account non trovato');
    if (!(await bcrypt.compare(password, auth.password))) {
      throw new BadRequestException('Password non corretta');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        phone: true, phoneVerified: true, emailVerified: true,
        profileImage: true, latitude: true, longitude: true, createdAt: true,
        psychologist: { select: { id: true } },
      },
    });
    const psychId = user.psychologist?.id ?? null;

    const [psychologist, questions, conversations, reviewsWritten, appointments, reportsMade] = await Promise.all([
      psychId ? this.psychologistSection(psychId) : null,
      this.prisma.question.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, title: true, content: true, isAnonymous: true, createdAt: true,
          answers: {
            orderBy: { createdAt: 'asc' },
            select: {
              content: true, createdAt: true,
              psychologist: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      }),
      this.prisma.conversation.findMany({
        where: psychId ? { psychologistId: psychId } : { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true, createdAt: true,
          User: { select: { firstName: true, lastName: true } },
          Psychologist: { select: { user: { select: { firstName: true, lastName: true } } } },
          Question: { select: { title: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            select: { content: true, createdAt: true, senderUserId: true, senderPsychId: true },
          },
        },
      }),
      this.prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          rating: true, comment: true, createdAt: true,
          Psychologist: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.appointment.findMany({
        where: psychId ? { psychologistId: psychId } : { userId },
        orderBy: { startTime: 'asc' },
        select: {
          title: true, notes: true, startTime: true, endTime: true, status: true,
          isExternal: true, externalClientName: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
          psychologist: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.report.findMany({
        where: { reporterUserId: userId },
        orderBy: { createdAt: 'asc' },
        select: { reason: true, details: true, status: true, createdAt: true, reportedLabel: true },
      }),
    ]);

    const isPsych = !!psychId;
    this.logger.log(`Export dati per user ${userId}`);

    return {
      info: {
        description: 'Export dei dati personali del tuo account Luminia Care (artt. 15 e 20 GDPR).',
        exportedAt: new Date().toISOString(),
        version: EXPORT_VERSION,
      },
      account: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        emailVerified: user.emailVerified,
        profileImage: user.profileImage,
        lastKnownLocation: user.latitude != null && user.longitude != null
          ? { latitude: user.latitude, longitude: user.longitude }
          : null,
        createdAt: user.createdAt,
      },
      psychologistProfile: psychologist,
      questions: questions.map(q => ({
        title: q.title,
        content: q.content,
        anonymous: q.isAnonymous,
        createdAt: q.createdAt,
        answersReceived: q.answers.map(a => ({
          from: fullName(a.psychologist.user),
          content: a.content,
          createdAt: a.createdAt,
        })),
      })),
      conversations: conversations.map(c => ({
        with: isPsych ? fullName(c.User) : fullName(c.Psychologist.user),
        startedFrom: c.Question?.title ?? null,
        createdAt: c.createdAt,
        messages: c.messages.map(m => {
          const mine = isPsych ? m.senderPsychId === psychId : m.senderUserId === userId;
          return { from: mine ? 'io' : 'altra parte', content: m.content, sentAt: m.createdAt };
        }),
      })),
      reviewsWritten: reviewsWritten.map(r => ({
        psychologist: fullName(r.Psychologist.user),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      appointments: appointments.map(a => ({
        title: a.title,
        with: isPsych
          ? (a.isExternal ? a.externalClientName : fullName(a.user))
          : fullName(a.psychologist.user),
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt,
      })),
      reportsMade: reportsMade.map(r => ({
        reported: r.reportedLabel,
        reason: REPORT_REASONS[r.reason as ReportReason] ?? r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  private async psychologistSection(psychId: string) {
    const p = await this.prisma.psychologist.findUniqueOrThrow({
      where: { id: psychId },
      select: {
        bio: true, alboCode: true, phone: true, profileImage: true, coverImage: true,
        isOnlineOnly: true, isPsychotherapist: true, isMale: true, createdAt: true,
        verified: true, alboVerified: true, alboOrdine: true, alboSezione: true,
        subscriptionPlan: true, subscriptionActive: true, contractVersion: true, contractAcceptedAt: true,
        addresses: { select: { address: true, latitude: true, longitude: true } },
        specializations: { select: { tagCode: true } },
        answers: {
          orderBy: { createdAt: 'asc' },
          select: { content: true, createdAt: true, question: { select: { title: true } } },
        },
        posts: { orderBy: { createdAt: 'asc' }, select: { content: true, imageUrl: true, createdAt: true } },
        Review: {
          orderBy: { createdAt: 'asc' },
          select: { rating: true, comment: true, createdAt: true, User: { select: { firstName: true } } },
        },
        // Area professionisti
        casesAuthored: {
          orderBy: { createdAt: 'asc' },
          select: {
            title: true, ageRange: true, setting: true, presentingProblem: true, question: true,
            status: true, createdAt: true, group: { select: { name: true, type: true } },
          },
        },
        caseMessages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          select: { content: true, createdAt: true, case: { select: { title: true } } },
        },
        supervisorProfile: {
          select: {
            active: true, bio: true, orientation: true, yearsExperience: true,
            priceIndividualCents: true, pricePerParticipantCents: true,
          },
        },
        supervisionSeats: {
          select: {
            status: true, paymentStatus: true, amountCents: true, paidAt: true,
            supervision: { select: { title: true, mode: true, status: true, createdAt: true } },
          },
        },
      },
    });
    const {
      specializations, answers, posts, Review, casesAuthored, caseMessages, supervisorProfile, supervisionSeats, ...profile
    } = p;
    return {
      ...profile,
      specializations: specializations.map(s => TAG_LABEL_MAP.get(s.tagCode) ?? s.tagCode),
      answersGiven: answers.map(a => ({ question: a.question.title, content: a.content, createdAt: a.createdAt })),
      posts,
      // Di chi recensisce si riporta solo il nome di battesimo, come già mostrato nel profilo pubblico
      reviewsReceived: Review.map(r => ({
        from: r.User.firstName, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
      })),
      professionalArea: {
        casesPresented: casesAuthored.map(({ group, ...c }) => ({ ...c, group: group.name, groupType: group.type })),
        messagesWritten: caseMessages.map(m => ({ case: m.case.title, content: m.content, createdAt: m.createdAt })),
        supervisorProfile,
        supervisionsJoined: supervisionSeats.map(s => ({ ...s.supervision, myStatus: s.status, payment: s.paymentStatus, amountCents: s.amountCents, paidAt: s.paidAt })),
      },
    };
  }
}
