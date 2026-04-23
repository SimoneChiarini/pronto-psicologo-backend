import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PsychologistService } from '../psychologist/psychologist.service';

@Controller('questions')
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly psychologistService: PsychologistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: CreateQuestionDto, @Request() req) {
    return this.questionService.create({ ...data, userId: req.user.userId });
  }

  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  /** Domande non ancora risposte dallo psicologo autenticato. */
  @UseGuards(JwtAuthGuard)
  @Get('for-psych')
  async findForPsych(@Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const psych = await this.psychologistService.findByUserId(req.user.userId);
    if (!psych) throw new UnauthorizedException('Profilo psicologo non trovato');
    return this.questionService.findUnansweredForPsychologist(
      psych.id,
      psych.latitude ?? undefined,
      psych.longitude ?? undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.questionService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateQuestionDto, @Request() req) {
    const question = await this.questionService.findOne(id);
    if (question?.userId !== req.user.userId) {
      throw new ForbiddenException('You can only edit your own questions');
    }
    return this.questionService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const question = await this.questionService.findOne(id);
    if (question?.userId !== req.user.userId) {
      throw new ForbiddenException('You can only delete your own questions');
    }
    return this.questionService.remove(id);
  }
}
