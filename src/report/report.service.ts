import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CaseMessageReportDto, CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { REPORT_REASONS, ReportReason } from './report.constants';

const USER_SUMMARY = { select: { id: true, firstName: true, lastName: true, email: true, role: true } };

type NamedUser = { firstName: string | null; lastName: string | null; role: string };

const userLabel = (u: NamedUser) =>
  `${[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'} (${u.role === 'PSYCHOLOGIST' ? 'psicologo' : 'utente'})`;

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private prisma: PrismaService, private email: EmailService) {}

  /**
   * Segnalazione dall'interno di una conversazione: il segnalato è sempre
   * l'altra parte, ricavato dal server (il client non può scegliere chi segnalare).
   */
  async create(reporterUserId: string, role: string, dto: CreateReportDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      select: { id: true, userId: true, Psychologist: { select: { userId: true } } },
    });
    if (!conversation) throw new NotFoundException('Conversazione non trovata');

    let reportedUserId: string;
    if (role === 'USER' && conversation.userId === reporterUserId) {
      reportedUserId = conversation.Psychologist.userId;
    } else if (role === 'PSYCHOLOGIST' && conversation.Psychologist.userId === reporterUserId) {
      reportedUserId = conversation.userId;
    } else {
      throw new ForbiddenException('Non fai parte di questa conversazione');
    }

    const pending = await this.prisma.report.findFirst({
      where: { reporterUserId, conversationId: conversation.id, status: { in: ['OPEN', 'IN_REVIEW'] } },
      select: { id: true },
    });
    if (pending) throw new ConflictException('Hai già una segnalazione aperta per questa conversazione');

    const reportedUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: reportedUserId },
      select: { firstName: true, lastName: true, role: true },
    });

    const report = await this.prisma.report.create({
      data: {
        reporterUserId,
        reportedUserId,
        // Resta leggibile anche se l'account segnalato viene poi cancellato
        reportedLabel: userLabel(reportedUser),
        conversationId: conversation.id,
        reason: dto.reason,
        details: dto.details?.trim() || null,
      },
      include: { reporter: USER_SUMMARY, reported: USER_SUMMARY },
    });

    // Notifica admin best-effort: non blocca né fa fallire la segnalazione
    void this.notifyAdmins({ reason: report.reason, reporter: report.reporter!, reported: report.reported! })
      .catch(e => this.logger.error('Notifica segnalazione fallita: ' + e.message));

    return { id: report.id, status: report.status };
  }

  /**
   * Segnalazione di un messaggio in un gruppo professionisti. Il segnalante deve
   * essere membro attivo del gruppo; il segnalato è l'autore del messaggio.
   * È l'unico modo in cui l'admin vede un contenuto dell'area professionisti.
   */
  async createForCaseMessage(reporterUserId: string, reporterPsychId: string, messageId: string, dto: CaseMessageReportDto) {
    const msg = await this.prisma.caseMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true, deletedAt: true,
        author: { select: { userId: true } },
        case: { select: { groupId: true } },
      },
    });
    if (!msg || msg.deletedAt) throw new NotFoundException('Messaggio non trovato');
    const member = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId: msg.case.groupId, psychologistId: reporterPsychId } },
      select: { status: true },
    });
    if (member?.status !== 'ACTIVE') throw new NotFoundException('Messaggio non trovato');
    if (!msg.author) throw new BadRequestException('L\'autore di questo messaggio non è più iscritto');
    if (msg.author.userId === reporterUserId) throw new BadRequestException('Non puoi segnalare un tuo messaggio');

    const pending = await this.prisma.report.findFirst({
      where: { reporterUserId, caseMessageId: messageId, status: { in: ['OPEN', 'IN_REVIEW'] } },
      select: { id: true },
    });
    if (pending) throw new ConflictException('Hai già segnalato questo messaggio');

    const reportedUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: msg.author.userId },
      select: { firstName: true, lastName: true, role: true },
    });
    const report = await this.prisma.report.create({
      data: {
        reporterUserId,
        reportedUserId: msg.author.userId,
        reportedLabel: userLabel(reportedUser),
        caseMessageId: messageId,
        reason: dto.reason,
        details: dto.details?.trim() || null,
      },
      include: { reporter: USER_SUMMARY, reported: USER_SUMMARY },
    });
    void this.notifyAdmins({ reason: report.reason, reporter: report.reporter!, reported: report.reported! })
      .catch(e => this.logger.error('Notifica segnalazione fallita: ' + e.message));
    return { id: report.id, status: report.status };
  }

  findAll(status?: string) {
    return this.prisma.report.findMany({
      where: status ? { status } : undefined,
      include: {
        reporter: USER_SUMMARY,
        reported: USER_SUMMARY,
        // Messaggio segnalato nell'area professionisti: l'admin vede SOLO questo messaggio
        caseMessage: {
          select: {
            content: true, deletedAt: true, createdAt: true,
            case: { select: { title: true, group: { select: { name: true, type: true } } } },
          },
        },
        // Stessa forma di /admin/conversations, per riusare il visualizzatore messaggi admin
        conversation: {
          select: {
            id: true,
            User: { select: { firstName: true, lastName: true, email: true } },
            Psychologist: { select: { alboCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateReportDto) {
    const closed = dto.status === 'RESOLVED' || dto.status === 'DISMISSED';
    try {
      return await this.prisma.report.update({
        where: { id },
        data: { status: dto.status, adminNote: dto.adminNote, resolvedAt: closed ? new Date() : null },
        include: { reporter: USER_SUMMARY, reported: USER_SUMMARY },
      });
    } catch {
      throw new NotFoundException('Segnalazione non trovata');
    }
  }

  private async notifyAdmins(report: { reason: string; reporter: NamedUser; reported: NamedUser & { id: string } }) {
    // REPORTS_EMAIL (lista separata da virgole) ha la precedenza sugli account ADMIN
    const override = process.env.REPORTS_EMAIL?.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = override?.length
      ? override
      : (await this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } })).map(u => u.email);
    if (!recipients.length) return;

    const openForReported = await this.prisma.report.count({
      where: { reportedUserId: report.reported.id, status: { in: ['OPEN', 'IN_REVIEW'] } },
    });

    await this.email.sendReportNotification(recipients, {
      reason: REPORT_REASONS[report.reason as ReportReason] ?? report.reason,
      reporter: userLabel(report.reporter),
      reported: userLabel(report.reported),
      openForReported,
    });
  }
}
