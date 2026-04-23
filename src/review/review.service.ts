import { Injectable } from '@nestjs/common';
import { Prisma, Review } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.ReviewCreateInput | Prisma.ReviewUncheckedCreateInput): Promise<Review> {
    return this.prisma.review.create({ data });
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
