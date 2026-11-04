import { Module } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { PsychologistController } from './psychologist.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [PrismaModule, AccountModule],
  providers: [PsychologistService],
  controllers: [PsychologistController],
  exports: [PsychologistService],
})
export class PsychologistModule {}
