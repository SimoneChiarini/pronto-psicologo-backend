import { Injectable } from '@nestjs/common';
import { Prisma, Conversation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.ConversationCreateInput | Prisma.ConversationUncheckedCreateInput): Promise<Conversation> {
    return this.prisma.conversation.create({ data });
  }

  findByUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      include: {
        Psychologist: {
          select: { id: true, alboCode: true, profileImage: true, verified: true, user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findByPsychologist(psychologistId: string) {
    return this.prisma.conversation.findMany({
      where: { psychologistId },
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } });
  }

  remove(id: string): Promise<Conversation> {
    return this.prisma.conversation.delete({ where: { id } });
  }
}
