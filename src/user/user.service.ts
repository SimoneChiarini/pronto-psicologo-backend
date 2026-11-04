import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  // Mai restituire password, token o hash al client
  private readonly SAFE_SELECT = {
    id: true, email: true, role: true, firstName: true, lastName: true, profileImage: true, createdAt: true,
  } satisfies Prisma.UserSelect;

  findAll() {
    return this.prisma.user.findMany({ select: this.SAFE_SELECT });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: this.SAFE_SELECT });
  }

  update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data, select: this.SAFE_SELECT });
  }

  // Nessun remove() qui: la cancellazione passa sempre da AccountService
  // (disdetta Stripe, file su storage, email), mai da un delete diretto.
}
