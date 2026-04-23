import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PsychologistModule } from '../psychologist/psychologist.module';

@Module({
  imports: [PrismaModule, PsychologistModule],
  providers: [ReviewService],
  controllers: [ReviewController],
})
export class ReviewModule {}
