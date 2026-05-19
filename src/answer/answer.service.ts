import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Answer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AnswerService {
  private readonly logger = new Logger(AnswerService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async create(data: Prisma.AnswerCreateInput | Prisma.AnswerUncheckedCreateInput): Promise<Answer> {
    const answer = await this.prisma.answer.create({ data });
    this.notifyQuestionOwner(answer).catch((e) => this.logger.warn('Notifica risposta fallita: ' + e.message));
    return answer;
  }

  findAll(): Promise<Answer[]> {
    return this.prisma.answer.findMany();
  }

  findOne(id: string): Promise<Answer | null> {
    return this.prisma.answer.findUnique({ where: { id } });
  }

  async findForUser(userId: string, userLat?: number, userLng?: number) {
    const questions = await this.prisma.question.findMany({
      where: { userId },
      select: { id: true },
    });
    if (questions.length === 0) return [];

    const questionIds = questions.map((q) => q.id);
    const answers = await this.prisma.answer.findMany({
      where: { questionId: { in: questionIds } },
      include: {
        psychologist: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
        question: { select: { id: true, title: true, content: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const withDistance = answers.map((a) => {
      const p = a.psychologist as any;
      const distanceKm =
        userLat != null && userLng != null && p.latitude != null && p.longitude != null
          ? Math.round(this.haversineKm(userLat, userLng, p.latitude, p.longitude) * 10) / 10
          : null;
      return { ...a, distanceKm };
    });

    if (userLat == null || userLng == null) return withDistance;

    return withDistance.sort((a, b) => {
      const dA = a.distanceKm ?? Infinity;
      const dB = b.distanceKm ?? Infinity;
      return dA - dB;
    });
  }

  update(id: string, data: Prisma.AnswerUpdateInput | Prisma.AnswerUncheckedUpdateInput): Promise<Answer> {
    return this.prisma.answer.update({ where: { id }, data });
  }

  remove(id: string): Promise<Answer> {
    return this.prisma.answer.delete({ where: { id } });
  }

  private async notifyQuestionOwner(answer: Answer): Promise<void> {
    const question = await this.prisma.question.findUnique({
      where: { id: answer.questionId },
      select: {
        title: true,
        user: { select: { fcmToken: true } },
      },
    });
    const fcmToken = question?.user?.fcmToken;
    if (!fcmToken) return;

    const psych = await this.prisma.psychologist.findUnique({
      where: { id: answer.psychologistId },
      select: { user: { select: { firstName: true, lastName: true } } },
    });
    const psychName = psych?.user
      ? `${psych.user.firstName ?? ''} ${psych.user.lastName ?? ''}`.trim()
      : 'Uno psicologo';

    await this.firebaseService.sendToToken(
      fcmToken,
      'Hai ricevuto una risposta!',
      `${psychName} ha risposto alla tua domanda: "${question!.title}"`,
    );
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
