import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Un utente può recensire uno psicologo solo se ha (o ha avuto) una
   * conversazione con lui, e una sola volta per psicologo.
   */
  async create(userId: string, data: { psychologistId: string; rating: number; comment?: string }): Promise<Review> {
    const { canReview, alreadyReviewed } = await this.getEligibility(userId, data.psychologistId);
    if (alreadyReviewed) throw new ConflictException('Hai già lasciato una recensione a questo psicologo');
    if (!canReview) throw new ForbiddenException('Puoi recensire solo psicologi con cui hai avuto una conversazione');

    try {
      return await this.prisma.review.create({
        data: { userId, psychologistId: data.psychologistId, rating: data.rating, comment: data.comment },
      });
    } catch (e) {
      // Doppio invio concorrente: il vincolo unico (userId, psychologistId) fa da rete di sicurezza
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Hai già lasciato una recensione a questo psicologo');
      }
      throw e;
    }
  }

  async getEligibility(userId: string, psychologistId: string) {
    const [conversation, existing] = await Promise.all([
      this.prisma.conversation.findFirst({ where: { userId, psychologistId }, select: { id: true } }),
      this.prisma.review.findUnique({
        where: { userId_psychologistId: { userId, psychologistId } },
        select: { id: true },
      }),
    ]);
    return { canReview: !!conversation && !existing, alreadyReviewed: !!existing };
  }

  findAll(): Promise<Review[]> {
    return this.prisma.review.findMany();
  }

  findByPsychologist(psychologistId: string) {
    return this.prisma.review.findMany({
      where: { psychologistId },
      include: {
        User: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.ReviewUpdateInput | Prisma.ReviewUncheckedUpdateInput): Promise<Review> {
    return this.prisma.review.update({ where: { id }, data });
  }

  remove(id: string): Promise<Review> {
    return this.prisma.review.delete({ where: { id } });
  }
}
