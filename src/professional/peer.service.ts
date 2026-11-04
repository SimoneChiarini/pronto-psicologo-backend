import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCaseDto, CreateCaseMessageDto, CreateGroupDto, CreateMeetingDto, UpdateCaseDto, UpdateGroupDto,
} from './dto/peer.dto';
import { assertAnonymized, isAllowedMeetingUrl } from './anonymization';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationService } from '../realtime/notification.service';

const MODERATOR_ROLES = ['OWNER', 'MODERATOR', 'SUPERVISOR'];

// Profilo minimo di un collega mostrato nell'area professionisti
export const COLLEAGUE_SELECT = {
  id: true,
  profileImage: true,
  isPsychotherapist: true,
  user: { select: { firstName: true, lastName: true } },
} satisfies Prisma.PsychologistSelect;

type ColleagueRow = Prisma.PsychologistGetPayload<{ select: typeof COLLEAGUE_SELECT }>;

export const toColleague = (p: ColleagueRow | null) => p && ({
  id: p.id,
  name: [p.user.firstName, p.user.lastName].filter(Boolean).join(' ') || 'Collega',
  profileImage: p.profileImage,
  isPsychotherapist: p.isPsychotherapist,
});

@Injectable()
export class PeerService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private notifications: NotificationService,
  ) {}

  // ── Notifiche (mai contenuti clinici: solo nome del gruppo e del collega) ──

  private async psychName(psychId: string) {
    const p = await this.prisma.psychologist.findUnique({ where: { id: psychId }, select: COLLEAGUE_SELECT });
    return toColleague(p)?.name ?? 'Un collega';
  }

  private async memberIds(groupId: string, roles?: string[]) {
    const rows = await this.prisma.peerGroupMember.findMany({
      where: { groupId, status: 'ACTIVE', ...(roles ? { role: { in: roles } } : {}) },
      select: { psychologistId: true },
    });
    return rows.map(r => r.psychologistId);
  }

  // ── Helpers di accesso ────────────────────────────────────

  /**
   * Il gruppo esiste e l'utente ne è membro ACTIVE. Per i non membri si risponde
   * 404 (e non 403) per non rivelare l'esistenza dei gruppi privati.
   */
  async requireMember(groupId: string, psychId: string) {
    const member = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: psychId } },
      include: { group: true },
    });
    if (!member || member.status !== 'ACTIVE') throw new NotFoundException('Gruppo non trovato');
    return member;
  }

  private async requireModerator(groupId: string, psychId: string) {
    const member = await this.requireMember(groupId, psychId);
    if (!MODERATOR_ROLES.includes(member.role)) {
      throw new ForbiddenException('Solo chi gestisce il gruppo può farlo');
    }
    return member;
  }

  private assertWritable(group: { archivedAt: Date | null }) {
    if (group.archivedAt) throw new BadRequestException('Il gruppo è archiviato');
  }

  /** Limite membri parametrico (AppSettings.maxGroupMembers, 0 = illimitato). */
  async assertRoomForMember(groupId: string) {
    const settings = await this.prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const max = settings?.maxGroupMembers ?? 0;
    if (max <= 0) return;
    const count = await this.prisma.peerGroupMember.count({
      where: { groupId, status: { in: ['ACTIVE', 'INVITED'] } },
    });
    if (count >= max) throw new ConflictException(`Il gruppo ha raggiunto il limite di ${max} membri`);
  }

  // ── Gruppi ────────────────────────────────────────────────

  async listMine(psychId: string) {
    const rows = await this.prisma.peerGroupMember.findMany({
      where: { psychologistId: psychId, status: 'ACTIVE', group: { type: 'INTERVISION' } },
      include: {
        group: {
          include: {
            _count: { select: { members: { where: { status: 'ACTIVE' } }, cases: { where: { status: 'OPEN' } } } },
          },
        },
      },
      orderBy: { group: { updatedAt: 'desc' } },
    });
    return rows.map(r => ({ ...this.groupSummary(r.group), myRole: r.role }));
  }

  async discover(psychId: string, q?: string) {
    const groups = await this.prisma.peerGroup.findMany({
      where: {
        type: 'INTERVISION',
        visibility: 'PUBLIC',
        archivedAt: null,
        members: { none: { psychologistId: psychId, status: 'ACTIVE' } },
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      },
      include: {
        _count: { select: { members: { where: { status: 'ACTIVE' } }, cases: { where: { status: 'OPEN' } } } },
        members: { where: { psychologistId: psychId }, select: { status: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return groups.map(g => ({ ...this.groupSummary(g), myStatus: g.members[0]?.status ?? null }));
  }

  private groupSummary(g: {
    id: string; type: string; name: string; description: string | null; visibility: string;
    topics: string[]; archivedAt: Date | null; createdAt: Date; updatedAt: Date;
    _count: { members: number; cases: number };
  }) {
    return {
      id: g.id, type: g.type, name: g.name, description: g.description, visibility: g.visibility,
      topics: g.topics, archived: !!g.archivedAt, createdAt: g.createdAt, updatedAt: g.updatedAt,
      memberCount: g._count.members, openCases: g._count.cases,
    };
  }

  async create(psychId: string, dto: CreateGroupDto) {
    const group = await this.prisma.peerGroup.create({
      data: {
        type: 'INTERVISION',
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        visibility: dto.visibility,
        topics: dto.topics ?? [],
        createdById: psychId,
        members: {
          create: { psychologistId: psychId, role: 'OWNER', status: 'ACTIVE', confidentialityAcceptedAt: new Date() },
        },
      },
    });
    return { id: group.id };
  }

  async detail(groupId: string, psychId: string) {
    const me = await this.requireMember(groupId, psychId);
    const isMod = MODERATOR_ROLES.includes(me.role);
    const group = await this.prisma.peerGroup.findUniqueOrThrow({
      where: { id: groupId },
      include: {
        members: {
          where: { status: isMod ? { in: ['ACTIVE', 'REQUESTED', 'INVITED'] } : 'ACTIVE' },
          include: { psychologist: { select: COLLEAGUE_SELECT } },
          orderBy: { joinedAt: 'asc' },
        },
        meetings: {
          where: { startsAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } }, // anche quelli appena iniziati
          orderBy: { startsAt: 'asc' },
          take: 20,
        },
        supervision: { select: { id: true, status: true, supervisorId: true } },
      },
    });
    return {
      id: group.id, type: group.type, name: group.name, description: group.description,
      visibility: group.visibility, topics: group.topics, archived: !!group.archivedAt,
      createdAt: group.createdAt, myRole: me.role, canModerate: isMod,
      supervision: group.supervision,
      members: group.members.map(m => ({ ...toColleague(m.psychologist), role: m.role, status: m.status })),
      meetings: group.meetings.map(m => ({
        id: m.id, title: m.title, startsAt: m.startsAt, url: m.url,
        canDelete: isMod || m.createdById === psychId,
      })),
    };
  }

  async update(groupId: string, psychId: string, dto: UpdateGroupDto) {
    const me = await this.requireModerator(groupId, psychId);
    this.assertWritable(me.group);
    if (me.group.type !== 'INTERVISION' && dto.visibility) {
      throw new BadRequestException('La visibilità di una stanza di supervisione non si può cambiare');
    }
    await this.prisma.peerGroup.update({
      where: { id: groupId },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        visibility: dto.visibility,
        topics: dto.topics,
      },
    });
    return { ok: true };
  }

  async archive(groupId: string, psychId: string) {
    const me = await this.requireMember(groupId, psychId);
    if (me.role !== 'OWNER') throw new ForbiddenException('Solo chi ha creato il gruppo può archiviarlo');
    await this.prisma.peerGroup.update({ where: { id: groupId }, data: { archivedAt: new Date() } });
    return { ok: true };
  }

  /** Richiesta di ingresso (gruppo pubblico) o accettazione di un invito. */
  async join(groupId: string, psychId: string) {
    const group = await this.prisma.peerGroup.findUnique({ where: { id: groupId } });
    const existing = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: psychId } },
    });
    if (!group || group.archivedAt || group.type !== 'INTERVISION') throw new NotFoundException('Gruppo non trovato');
    if (existing?.status === 'ACTIVE') return { status: 'ACTIVE' };

    if (existing?.status === 'INVITED') {
      // Il posto era già conteggiato dall'invito
      await this.prisma.peerGroupMember.update({
        where: { groupId_psychologistId: { groupId, psychologistId: psychId } },
        data: { status: 'ACTIVE', confidentialityAcceptedAt: new Date(), joinedAt: new Date() },
      });
      return { status: 'ACTIVE' };
    }
    if (group.visibility !== 'PUBLIC') throw new NotFoundException('Gruppo non trovato');
    if (existing?.status === 'REQUESTED') return { status: 'REQUESTED' };

    await this.prisma.peerGroupMember.create({
      data: { groupId, psychologistId: psychId, role: 'MEMBER', status: 'REQUESTED', confidentialityAcceptedAt: new Date() },
    });
    this.notifications.notifyPsychologists(await this.memberIds(groupId, MODERATOR_ROLES), {
      type: 'group_request',
      title: 'Richiesta di ingresso',
      body: `${await this.psychName(psychId)} vuole entrare in «${group.name}»`,
      groupId,
    });
    return { status: 'REQUESTED' };
  }

  async declineInvite(groupId: string, psychId: string) {
    await this.prisma.peerGroupMember.deleteMany({
      where: { groupId, psychologistId: psychId, status: 'INVITED' },
    });
    return { ok: true };
  }

  async leave(groupId: string, psychId: string) {
    const me = await this.requireMember(groupId, psychId);
    if (me.role === 'OWNER') {
      throw new BadRequestException('Chi ha creato il gruppo non può uscirne: puoi archiviarlo');
    }
    if (me.role === 'SUPERVISOR') {
      throw new BadRequestException('Il supervisore non può uscire dalla stanza: chiudi la supervisione');
    }
    await this.prisma.peerGroupMember.delete({
      where: { groupId_psychologistId: { groupId, psychologistId: psychId } },
    });
    return { ok: true };
  }

  async invitations(psychId: string) {
    const rows = await this.prisma.peerGroupMember.findMany({
      where: { psychologistId: psychId, status: 'INVITED', group: { archivedAt: null, type: 'INTERVISION' } },
      include: {
        group: {
          include: {
            _count: { select: { members: { where: { status: 'ACTIVE' } }, cases: { where: { status: 'OPEN' } } } },
          },
        },
      },
    });
    return rows.map(r => this.groupSummary(r.group));
  }

  async invite(groupId: string, psychId: string, targetId: string) {
    const me = await this.requireModerator(groupId, psychId);
    this.assertWritable(me.group);
    if (me.group.type !== 'INTERVISION') throw new BadRequestException('Nelle supervisioni i partecipanti si aggiungono dalla richiesta');
    const target = await this.prisma.psychologist.findFirst({
      where: { id: targetId, verified: true, subscriptionActive: true },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('Collega non trovato');
    const existing = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
    });
    if (existing?.status === 'ACTIVE') throw new ConflictException('È già membro del gruppo');
    if (existing?.status === 'REQUESTED') return this.approve(groupId, psychId, targetId);
    if (existing?.status === 'INVITED') return { status: 'INVITED' };

    await this.assertRoomForMember(groupId);
    await this.prisma.peerGroupMember.create({
      data: { groupId, psychologistId: targetId, role: 'MEMBER', status: 'INVITED' },
    });
    this.notifications.notifyPsychologists([targetId], {
      type: 'group_invite',
      title: 'Invito a un gruppo di intervisione',
      body: `${await this.psychName(psychId)} ti ha invitato in «${me.group.name}»`,
      groupId,
    });
    return { status: 'INVITED' };
  }

  async approve(groupId: string, psychId: string, targetId: string) {
    const me = await this.requireModerator(groupId, psychId);
    this.assertWritable(me.group);
    const req = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
    });
    if (!req || req.status !== 'REQUESTED') throw new NotFoundException('Richiesta non trovata');
    await this.assertRoomForMember(groupId);
    await this.prisma.peerGroupMember.update({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
      data: { status: 'ACTIVE', joinedAt: new Date() },
    });
    this.notifications.notifyPsychologists([targetId], {
      type: 'group_approved',
      title: 'Richiesta accettata',
      body: `Ora fai parte di «${me.group.name}»`,
      groupId,
    });
    return { status: 'ACTIVE' };
  }

  /** Rifiuta una richiesta, ritira un invito o rimuove un membro. */
  async removeMember(groupId: string, psychId: string, targetId: string) {
    const me = await this.requireModerator(groupId, psychId);
    if (targetId === psychId) throw new BadRequestException('Per uscire usa "Lascia il gruppo"');
    const target = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
    });
    if (!target) throw new NotFoundException('Membro non trovato');
    if (target.role === 'OWNER' || target.role === 'SUPERVISOR') {
      throw new ForbiddenException('Non puoi rimuovere chi gestisce il gruppo');
    }
    if (me.group.type === 'SUPERVISION') {
      throw new BadRequestException('I partecipanti di una supervisione non si rimuovono da qui');
    }
    await this.prisma.peerGroupMember.delete({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
    });
    return { ok: true };
  }

  async setModerator(groupId: string, psychId: string, targetId: string, moderator: boolean) {
    const me = await this.requireMember(groupId, psychId);
    if (me.role !== 'OWNER') throw new ForbiddenException('Solo chi ha creato il gruppo può nominare moderatori');
    const target = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
    });
    if (!target || target.status !== 'ACTIVE' || target.role === 'OWNER') throw new NotFoundException('Membro non trovato');
    await this.prisma.peerGroupMember.update({
      where: { groupId_psychologistId: { groupId, psychologistId: targetId } },
      data: { role: moderator ? 'MODERATOR' : 'MEMBER' },
    });
    return { ok: true };
  }

  /** Colleghi invitabili: verificati, con abbonamento attivo, non già nel gruppo. */
  async searchColleagues(psychId: string, q: string, groupId?: string) {
    const term = q.trim();
    if (term.length < 2) return [];
    const rows = await this.prisma.psychologist.findMany({
      where: {
        id: { not: psychId },
        verified: true,
        subscriptionActive: true,
        OR: [
          { user: { firstName: { contains: term, mode: 'insensitive' } } },
          { user: { lastName: { contains: term, mode: 'insensitive' } } },
        ],
        ...(groupId ? { groupMemberships: { none: { groupId } } } : {}),
      },
      select: COLLEAGUE_SELECT,
      take: 20,
    });
    return rows.map(toColleague);
  }

  // ── Casi ──────────────────────────────────────────────────

  async listCases(groupId: string, psychId: string) {
    await this.requireMember(groupId, psychId);
    const cases = await this.prisma.caseDiscussion.findMany({
      where: { groupId },
      orderBy: [{ status: 'desc' }, { lastActivityAt: 'desc' }], // OPEN prima di CLOSED
      include: {
        author: { select: COLLEAGUE_SELECT },
        _count: { select: { messages: { where: { deletedAt: null } } } },
      },
    });
    return cases.map(c => ({
      id: c.id, title: c.title, ageRange: c.ageRange, setting: c.setting, status: c.status,
      author: toColleague(c.author), isMine: c.authorId === psychId,
      messageCount: c._count.messages, lastActivityAt: c.lastActivityAt, createdAt: c.createdAt,
    }));
  }

  async createCase(groupId: string, psychId: string, dto: CreateCaseDto) {
    const me = await this.requireMember(groupId, psychId);
    this.assertWritable(me.group);
    assertAnonymized(dto.acknowledgeWarnings, dto.title, dto.presentingProblem, dto.question);
    const c = await this.prisma.caseDiscussion.create({
      data: {
        groupId,
        authorId: psychId,
        title: dto.title.trim(),
        ageRange: dto.ageRange,
        setting: dto.setting,
        presentingProblem: dto.presentingProblem.trim(),
        question: dto.question.trim(),
        anonymizationConfirmedAt: new Date(),
      },
    });
    await this.touchGroup(groupId);
    this.notifications.notifyPsychologists(await this.memberIds(groupId), {
      type: 'case_new',
      title: me.group.type === 'SUPERVISION' ? 'Nuovo caso in supervisione' : 'Nuovo caso nel gruppo',
      body: `${await this.psychName(psychId)} ha presentato un caso in «${me.group.name}»`,
      groupId,
      caseId: c.id,
    }, psychId);
    return { id: c.id };
  }

  private async requireCaseAccess(caseId: string, psychId: string) {
    const c = await this.prisma.caseDiscussion.findUnique({ where: { id: caseId } });
    if (!c) throw new NotFoundException('Caso non trovato');
    const me = await this.requireMember(c.groupId, psychId);
    return { c, me };
  }

  async caseDetail(caseId: string, psychId: string) {
    const { c, me } = await this.requireCaseAccess(caseId, psychId);
    const [author, messages] = await Promise.all([
      this.prisma.psychologist.findUnique({ where: { id: c.authorId }, select: COLLEAGUE_SELECT }),
      this.prisma.caseMessage.findMany({
        where: { caseId },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: COLLEAGUE_SELECT } },
      }),
    ]);
    return {
      id: c.id, groupId: c.groupId, groupName: me.group.name, groupType: me.group.type,
      title: c.title, ageRange: c.ageRange, setting: c.setting,
      presentingProblem: c.presentingProblem, question: c.question, status: c.status,
      createdAt: c.createdAt, author: toColleague(author), isMine: c.authorId === psychId,
      canClose: c.authorId === psychId || MODERATOR_ROLES.includes(me.role),
      archived: !!me.group.archivedAt,
      messages: messages.map(m => ({
        id: m.id,
        // Contenuto rimosso dall'autore: resta il segnaposto per non spezzare il filo
        content: m.deletedAt ? null : m.content,
        deleted: !!m.deletedAt,
        createdAt: m.createdAt,
        author: m.author ? toColleague(m.author) : null,
        isMine: m.authorId === psychId,
      })),
    };
  }

  async updateCase(caseId: string, psychId: string, dto: UpdateCaseDto) {
    const { c, me } = await this.requireCaseAccess(caseId, psychId);
    if (c.authorId !== psychId && !MODERATOR_ROLES.includes(me.role)) {
      throw new ForbiddenException('Solo chi ha presentato il caso può chiuderlo');
    }
    await this.prisma.caseDiscussion.update({ where: { id: caseId }, data: { status: dto.status } });
    return { ok: true };
  }

  async deleteCase(caseId: string, psychId: string) {
    const { c } = await this.requireCaseAccess(caseId, psychId);
    if (c.authorId !== psychId) throw new ForbiddenException('Solo chi ha presentato il caso può eliminarlo');
    await this.prisma.caseDiscussion.delete({ where: { id: caseId } });
    return { ok: true };
  }

  async postMessage(caseId: string, psychId: string, dto: CreateCaseMessageDto) {
    const { c, me } = await this.requireCaseAccess(caseId, psychId);
    this.assertWritable(me.group);
    if (c.status === 'CLOSED') throw new BadRequestException('Il caso è chiuso');
    assertAnonymized(dto.acknowledgeWarnings, dto.content);
    const msg = await this.prisma.caseMessage.create({
      data: { caseId, authorId: psychId, content: dto.content.trim() },
    });
    await this.prisma.caseDiscussion.update({ where: { id: caseId }, data: { lastActivityAt: new Date() } });
    await this.touchGroup(c.groupId);

    this.realtime.toCase(caseId, 'case:message', { caseId, messageId: msg.id });
    // "Chi segue il caso": autore + chi ha già scritto (+ supervisore nelle stanze di supervisione)
    const writers = await this.prisma.caseMessage.findMany({
      where: { caseId, authorId: { not: null } },
      select: { authorId: true },
      distinct: ['authorId'],
    });
    const supervisors = me.group.type === 'SUPERVISION' ? await this.memberIds(c.groupId, ['SUPERVISOR']) : [];
    this.notifications.notifyPsychologists([c.authorId, ...writers.map(w => w.authorId), ...supervisors], {
      type: 'case_message',
      title: 'Nuovo intervento',
      body: `${await this.psychName(psychId)} ha risposto in un caso di «${me.group.name}»`,
      groupId: c.groupId,
      caseId,
    }, psychId);
    return { id: msg.id };
  }

  async deleteMessage(messageId: string, psychId: string) {
    const msg = await this.prisma.caseMessage.findUnique({ where: { id: messageId } });
    if (!msg || msg.authorId !== psychId) throw new NotFoundException('Messaggio non trovato');
    await this.prisma.caseMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '' }, // il testo viene davvero rimosso
    });
    this.realtime.toCase(msg.caseId, 'case:message', { caseId: msg.caseId, messageId });
    return { ok: true };
  }

  // ── Incontri (link videochiamata esterna) ─────────────────

  async createMeeting(groupId: string, psychId: string, dto: CreateMeetingDto) {
    const me = await this.requireMember(groupId, psychId);
    this.assertWritable(me.group);
    const url = dto.url.trim();
    if (!isAllowedMeetingUrl(url)) {
      throw new BadRequestException('Inserisci un link https di Google Meet, Microsoft Teams, Zoom, Jitsi o Whereby');
    }
    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
      throw new BadRequestException('La data dell\'incontro è nel passato');
    }
    const m = await this.prisma.groupMeeting.create({
      data: { groupId, createdById: psychId, title: dto.title.trim(), startsAt, url },
    });
    await this.touchGroup(groupId);
    const when = startsAt.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    this.notifications.notifyPsychologists(await this.memberIds(groupId), {
      type: 'meeting',
      title: 'Nuovo incontro in videochiamata',
      body: `«${me.group.name}» · ${when}`,
      groupId,
    }, psychId);
    return { id: m.id };
  }

  async deleteMeeting(meetingId: string, psychId: string) {
    const m = await this.prisma.groupMeeting.findUnique({ where: { id: meetingId } });
    if (!m) throw new NotFoundException('Incontro non trovato');
    const me = await this.requireMember(m.groupId, psychId);
    if (m.createdById !== psychId && !MODERATOR_ROLES.includes(me.role)) {
      throw new ForbiddenException('Puoi eliminare solo gli incontri che hai creato');
    }
    await this.prisma.groupMeeting.delete({ where: { id: meetingId } });
    return { ok: true };
  }

  private touchGroup(groupId: string) {
    return this.prisma.peerGroup.update({ where: { id: groupId }, data: { updatedAt: new Date() } });
  }
}
