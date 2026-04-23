import { Module } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { PsychologistController } from './psychologist.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PsychologistService],
  controllers: [PsychologistController],
  exports: [PsychologistService],
})
export class PsychologistModule {}
