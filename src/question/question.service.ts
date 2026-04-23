import { Injectable } from '@nestjs/common';
import { Prisma, Question } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.QuestionCreateInput | Prisma.QuestionUncheckedCreateInput): Promise<Question> {
    return this.prisma.question.create({ data });
  }

  findAll(): Promise<Question[]> {
    return this.prisma.question.findMany();
  }

  async findUnansweredForPsychologist(psychologistId: string, psychLat?: number, psychLng?: number) {
    // Carica impostazioni admin (X=raggio, Y=minuti espansione, Z=max risposte)
    const settings = await this.prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });

    const questions = await this.prisma.question.findMany({
      where: { answers: { none: { psychologistId } } },
      include: {
        user: { select: { firstName: true, lastName: true, latitude: true, longitude: true } },
        _count: { select: { answers: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filtro Z: escludi domande che hanno già ricevuto il numero massimo di risposte
    const withinLimit = questions.filter(q => q._count.answers < settings.maxAnswers);

    // Se lo psicologo non ha coordinate, mostra tutte (ordine per data)
    if (psychLat == null || psychLng == null) return withinLimit;

    const now = Date.now();

    return withinLimit
      .filter(q => {
        const user = q.user as any;
        // Se l'utente non ha ancora coordinate, mostra la domanda
        if (user.latitude == null || user.longitude == null) return true;

        const ageMinutes = (now - new Date(q.createdAt!).getTime()) / 60000;
        const doublings = Math.floor(ageMinutes / settings.expandMinutes);
        // Raggio effettivo: X * 2^doublings, capped a 5000 km
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
