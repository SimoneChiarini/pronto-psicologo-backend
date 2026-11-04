import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { NotificationService } from '../realtime/notification.service';

const nameOf = (u?: { firstName: string | null; lastName: string | null } | null) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ');

@Injectable()
export class MessageService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
    private notifications: NotificationService,
  ) {}

  async create(data: {
    conversationId: string;
    content: string;
    senderUserId?: string;
    senderPsychId?: string;
  }) {
    const [message, conv] = await this.prisma.$transaction([
      this.prisma.message.create({ data }),
      this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
        select: {
          userId: true,
          User: { select: { firstName: true, lastName: true } },
          Psychologist: { select: { userId: true, user: { select: { firstName: true, lastName: true } } } },
        },
      }),
    ]);

    // Chi ha la chat aperta la aggiorna subito; l'altra parte riceve anche una notifica
    this.realtime.toConversation(data.conversationId, 'message:new', {
      conversationId: data.conversationId,
      messageId: message.id,
    });
    const fromPsych = !!data.senderPsychId;
    this.notifications.notifyUsers([fromPsych ? conv.userId : conv.Psychologist.userId], {
      type: 'message',
      title: 'Nuovo messaggio',
      body: fromPsych
        ? `${nameOf(conv.Psychologist.user) || 'Il tuo psicologo'} ti ha scritto`
        : `${nameOf(conv.User) || 'Un utente'} ti ha scritto`,
      conversationId: data.conversationId,
    });
    return message;
  }

  findByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async verifyConversationAccess(conversationId: string, userId: string, psychologistId?: string | null) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return false;
    return conversation.userId === userId || conversation.psychologistId === psychologistId;
  }
}
