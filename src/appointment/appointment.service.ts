import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RequestSlotDto } from './dto/request-slot.dto';

const USER_SELECT = { firstName: true, lastName: true, email: true, profileImage: true };
const PSYCH_INCLUDE = { user: { select: USER_SELECT } };

@Injectable()
export class AppointmentService {
  constructor(private prisma: PrismaService) {}

  create(psychologistId: string, dto: CreateAppointmentDto) {
    return this.prisma.appointment.create({
      data: {
        title: dto.title,
        notes: dto.notes,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isExternal: dto.isExternal ?? false,
        externalClientName: dto.externalClientName,
        userId: dto.userId ?? null,
        psychologistId,
        status: 'CONFIRMED',
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  requestSlot(userId: string, dto: RequestSlotDto) {
    const start = new Date(dto.startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return this.prisma.appointment.create({
      data: {
        title: 'Richiesta seduta',
        notes: dto.notes,
        startTime: start,
        endTime: end,
        isExternal: false,
        userId,
        psychologistId: dto.psychologistId,
        status: 'PENDING',
      },
      include: { psychologist: { include: PSYCH_INCLUDE } },
    });
  }

  acceptSlot(id: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  rejectSlot(id: string) {
    return this.prisma.appointment.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  getPublicSlots(psychologistId: string, date: string, endDate?: string) {
    const day = new Date(date);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0);
    let end: Date;
    if (endDate) {
      const endDay = new Date(endDate);
      end = new Date(endDay.getFullYear(), endDay.getMonth(), endDay.getDate() + 1, 0, 0, 0);
    } else {
      end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0);
    }
    return this.prisma.appointment.findMany({
      where: {
        psychologistId,
        startTime: { gte: start, lt: end },
        status: { not: 'REJECTED' },
      },
      select: { id: true, startTime: true, endTime: true, status: true, userId: true },
      orderBy: { startTime: 'asc' },
    });
  }

  findAgenda(psychologistId: string) {
    return this.prisma.appointment.findMany({
      where: { psychologistId },
      include: { user: { select: USER_SELECT } },
      orderBy: { startTime: 'asc' },
    });
  }

  findForUser(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      include: { psychologist: { include: PSYCH_INCLUDE } },
      orderBy: { startTime: 'asc' },
    });
  }

  update(id: string, dto: UpdateAppointmentDto) {
    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime)   data.endTime   = new Date(dto.endTime);
    return this.prisma.appointment.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.appointment.delete({ where: { id } });
  }
}
