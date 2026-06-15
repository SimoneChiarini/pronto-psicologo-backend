import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Question } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async create(data: Prisma.QuestionCreateInput | Prisma.QuestionUncheckedCreateInput): Promise<Question> {
    const question = await this.prisma.question.create({ data });
    this.notifyNearbyPsychologists(question).catch((e) => this.logger.warn('Notifica domanda fallita: ' + e.message));
    return question;
  }

  findAll(): Promise<Question[]> {
    return this.prisma.question.findMany();
  }

  async findUnansweredForPsychologist(psychologistId: string, psychLat?: number, psychLng?: number) {
    const settings = await this.prisma.appSettings.findFirst() ?? { radiusKm: 50, expandMinutes: 60, maxAnswers: 5 };

    const questions = await this.prisma.question.findMany({
      where: { answers: { none: { psychologistId } } },
      include: {
        user: { select: { firstName: true, lastName: true, latitude: true, longitude: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const withinLimit = questions.filter(q => q._count.answers < settings.maxAnswers);

    if (psychLat == null || psychLng == null) return withinLimit;

    const now = Date.now();

    return withinLimit
      .filter(q => {
        const user = q.user as any;
        if (user.latitude == null || user.longitude == null) return true;

        const ageMinutes = (now - new Date(q.createdAt!).getTime()) / 60000;
        const doublings = Math.floor(ageMinutes / settings.expandMinutes);
        const effectiveRadius = Math.min(settings.radiusKm * Math.pow(2, doublings), 5000);
        const distance = this.haversineKm(psychLat, psychLng, user.latitude, user.longitude);
        return distance <= effectiveRadius;
      })
      .sort((a, b) => {
        const uA = a.user as any;
        const uB = b.user as any;
        const dA = uA.latitude != null ? this.haversineKm(psychLat, psychLng, uA.latitude, uA.longitude) : Infinity;
        const dB = uB.latitude != null ? this.haversineKm(psychLat, psychLng, uB.latitude, uB.longitude) : Infinity;
        return dA - dB;
      });
  }

  findOne(id: string): Promise<Question | null> {
    return this.prisma.question.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.QuestionUpdateInput | Prisma.QuestionUncheckedUpdateInput): Promise<Question> {
    return this.prisma.question.update({ where: { id }, data });
  }

  remove(id: string): Promise<Question> {
    return this.prisma.question.delete({ where: { id } });
  }

  private async notifyNearbyPsychologists(question: Question): Promise<void> {
    const settings = await this.prisma.appSettings.findFirst() ?? { radiusKm: 50, expandMinutes: 60, maxAnswers: 5 };

    const questionUser = await this.prisma.user.findUnique({
      where: { id: question.userId },
      select: { latitude: true, longitude: true },
    });

    const psychologists = await this.prisma.psychologist.findMany({
      where: { user: { fcmToken: { not: null } } },
      select: {
        latitude: true,
        longitude: true,
        user: { select: { fcmToken: true } },
      },
    });

    const uLat = questionUser?.latitude;
    const uLng = questionUser?.longitude;

    const tokens = psychologists
      .filter(p => {
        if (uLat == null || uLng == null) return true;
        if (p.latitude == null || p.longitude == null) return true;
        return this.haversineKm(uLat, uLng, p.latitude, p.longitude) <= settings.radiusKm;
      })
      .map(p => p.user.fcmToken!)
      .filter(Boolean);

    if (tokens.length === 0) return;

    const sender = question.isAnonymous ? 'Un utente anonimo' : 'Un nuovo utente';
    await this.firebaseService.sendToTokens(
      tokens,
      'Nuova domanda disponibile',
      `${sender} ha posto una domanda: "${question.title}"`,
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
