import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PsychologistModule } from '../psychologist/psychologist.module';

@Module({
  imports: [PrismaModule, PsychologistModule],
  providers: [AppointmentService],
  controllers: [AppointmentController],
})
export class AppointmentModule {}
