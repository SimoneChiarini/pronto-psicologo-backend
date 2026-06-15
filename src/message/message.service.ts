import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    conversationId: string;
    content: string;
    senderUserId?: string;
    senderPsychId?: string;
  }) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data }),
      this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
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
