import { Controller, Post, Get, Param, Body, UseGuards, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PsychologistService } from '../psychologist/psychologist.service';

@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly psychologistService: PsychologistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() data: CreateMessageDto, @Request() req) {
    const psychologist = req.user.role === 'PSYCHOLOGIST'
      ? await this.psychologistService.findByUserId(req.user.userId)
      : null;

    const hasAccess = await this.messageService.verifyConversationAccess(
      data.conversationId,
      req.user.userId,
      psychologist?.id,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    return this.messageService.create({
      conversationId: data.conversationId,
      content: data.content,
      senderUserId: req.user.role === 'USER' ? req.user.userId : undefined,
      senderPsychId: psychologist?.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversation/:conversationId')
  async findByConversation(@Param('conversationId') conversationId: string, @Request() req) {
    const psychologist = req.user.role === 'PSYCHOLOGIST'
      ? await this.psychologistService.findByUserId(req.user.userId)
      : null;

    const hasAccess = await this.messageService.verifyConversationAccess(
      conversationId,
      req.user.userId,
      psychologist?.id,
    );
    if (!hasAccess) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    return this.messageService.findByConversation(conversationId);
  }
}
