import { Injectable } from '@nestjs/common';
import { Prisma, Answer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnswerService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.AnswerCreateInput | Prisma.AnswerUncheckedCreateInput): Promise<Answer> {
    return this.prisma.answer.create({ data });
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
