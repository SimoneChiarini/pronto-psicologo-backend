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
    return this.prisma.message.create({ data });
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
