import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AnswerService } from './answer.service';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PsychologistService } from '../psychologist/psychologist.service';

@Controller('answers')
export class AnswerController {
  constructor(
    private readonly answerService: AnswerService,
    private readonly psychologistService: PsychologistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('my-questions')
  getMyAnswers(
    @Request() req,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    const userLat = lat ? parseFloat(lat) : undefined;
    const userLng = lng ? parseFloat(lng) : undefined;
    return this.answerService.findForUser(req.user.userId, userLat, userLng);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() data: CreateAnswerDto, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') {
      throw new ForbiddenException('Only psychologists can answer questions');
    }
    const psychologist = await this.psychologistService.findByUserId(req.user.userId);
    if (!psychologist) {
      throw new UnauthorizedException('Psychologist profile not found');
    }
    return this.answerService.create({ ...data, psychologistId: psychologist.id });
  }

  @Get()
  findAll() {
    return this.answerService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.answerService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateAnswerDto, @Request() req) {
    const psychologist = await this.psychologistService.findByUserId(req.user.userId);
    const answer = await this.answerService.findOne(id);
    if (answer?.psychologistId !== psychologist?.id) {
      throw new ForbiddenException('You can only edit your own answers');
    }
    return this.answerService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const psychologist = await this.psychologistService.findByUserId(req.user.userId);
    const answer = await this.answerService.findOne(id);
    if (answer?.psychologistId !== psychologist?.id) {
      throw new ForbiddenException('You can only delete your own answers');
    }
    return this.answerService.remove(id);
  }
}
