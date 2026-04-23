import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PsychologistService } from '../psychologist/psychologist.service';

@Controller('conversations')
export class ConversationController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly psychologistService: PsychologistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: CreateConversationDto, @Request() req) {
    return this.conversationService.create({ ...data, userId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    if (req.user.role === 'PSYCHOLOGIST') {
      const psych = await this.psychologistService.findByUserId(req.user.userId);
      if (!psych) throw new UnauthorizedException('Profilo psicologo non trovato');
      return this.conversationService.findByPsychologist(psych.id);
    }
    return this.conversationService.findByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const conversation = await this.conversationService.findOne(id);
    if (!conversation) throw new ForbiddenException('Conversazione non trovata');

    const psych = req.user.role === 'PSYCHOLOGIST'
      ? await this.psychologistService.findByUserId(req.user.userId)
      : null;

    const isOwner = conversation.userId === req.user.userId ||
      conversation.psychologistId === psych?.id;

    if (!isOwner) throw new ForbiddenException('Accesso negato');
    return conversation;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const conversation = await this.conversationService.findOne(id);
    if (conversation?.userId !== req.user.userId) {
      throw new ForbiddenException('Puoi eliminare solo le tue conversazioni');
    }
    return this.conversationService.remove(id);
  }
}
