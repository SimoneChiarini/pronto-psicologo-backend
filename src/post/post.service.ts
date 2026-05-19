import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';

const PSYCH_INCLUDE = {
  psychologist: {
    include: {
      user: { select: { firstName: true, lastName: true, profileImage: true } },
    },
  },
};

@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  create(psychologistId: string, dto: CreatePostDto) {
    return this.prisma.post.create({
      data: { content: dto.content, imageUrl: dto.imageUrl, psychologistId },
      include: PSYCH_INCLUDE,
    });
  }

  findByPsychologist(psychologistId: string) {
    return this.prisma.post.findMany({
      where: { psychologistId },
      orderBy: { createdAt: 'desc' },
      include: PSYCH_INCLUDE,
    });
  }

  async remove(id: string, psychologistId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.psychologistId !== psychologistId) throw new ForbiddenException();
    return this.prisma.post.delete({ where: { id } });
  }
}
