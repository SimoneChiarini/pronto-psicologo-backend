import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Request, Query, UseGuards, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { PsychologistService } from '../psychologist/psychologist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { RequestSlotDto } from './dto/request-slot.dto';

@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly psychologistService: PsychologistService,
  ) {}

  // Psicologo crea slot direttamente (CONFIRMED)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateAppointmentDto, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const psych = await this.psychologistService.findByUserId(req.user.userId);
    if (!psych) throw new UnauthorizedException('Profilo psicologo non trovato');
    return this.appointmentService.create(psych.id, dto);
  }

  // Utente richiede uno slot (PENDING)
  @UseGuards(JwtAuthGuard)
  @Post('request')
  requestSlot(@Body() dto: RequestSlotDto, @Request() req) {
    return this.appointmentService.requestSlot(req.user.userId, dto);
  }

  // Psicologo accetta una richiesta
  @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async acceptSlot(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    return this.appointmentService.acceptSlot(id);
  }

  // Psicologo rifiuta una richiesta
  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async rejectSlot(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    return this.appointmentService.rejectSlot(id);
  }

  // Slot pubblici di un giorno per un psicologo (visibile a tutti)
  @Get('public/:psychologistId')
  getPublicSlots(
    @Param('psychologistId') psychologistId: string,
    @Query('date') date: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.appointmentService.getPublicSlots(
      psychologistId,
      date ?? new Date().toISOString().split('T')[0],
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('agenda')
  async getAgenda(@Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const psych = await this.psychologistService.findByUserId(req.user.userId);
    if (!psych) throw new UnauthorizedException();
    return this.appointmentService.findAgenda(psych.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  getMine(@Request() req) {
    return this.appointmentService.findForUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    return this.appointmentService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    return this.appointmentService.remove(id);
  }
}
