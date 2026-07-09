import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    return this.prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
  }

  async updateSettings(data: { radiusKm?: number; expandMinutes?: number; maxAnswers?: number }) {
    return this.prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
  }

  getAllQuestions() {
    return this.prisma.question.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        answers: {
          include: {
            psychologist: { select: { alboCode: true, bio: true, verified: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  getAllConversations() {
    return this.prisma.conversation.findMany({
      include: {
        User: { select: { firstName: true, lastName: true, email: true } },
        Psychologist: { select: { alboCode: true, verified: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  getConversationMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        senderUser: { select: { firstName: true, lastName: true, email: true } },
        senderPsych: { select: { alboCode: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  getAllUsers() {
    return this.prisma.user.findMany({
      where: { role: 'USER' },
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, latitude: true, longitude: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllPsychologists() {
    const psychologists = await this.prisma.psychologist.findMany({
      include: {
        Review: { select: { rating: true } },
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return psychologists.map(p => {
      const { Review, ...rest } = p;
      const avgRating = Review.length > 0
        ? Math.round((Review.reduce((s, r) => s + r.rating, 0) / Review.length) * 10) / 10
        : null;
      return { ...rest, avgRating, reviewCount: Review.length };
    });
  }

  setPsychologistVerified(id: string, verified: boolean) {
    return this.prisma.psychologist.update({
      where: { id },
      data: { verified },
      select: { id: true, verified: true },
    });
  }

  getAllAnswers() {
    return this.prisma.answer.findMany({
      include: {
        psychologist: { select: { alboCode: true, bio: true, verified: true } },
        question: { select: { title: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
