import {
  Controller, Get, Post, Delete,
  Param, Body, Request, UseGuards, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { PsychologistService } from '../psychologist/psychologist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';

@Controller('posts')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly psychologistService: PsychologistService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreatePostDto, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const psych = await this.psychologistService.findByUserId(req.user.userId);
    if (!psych) throw new UnauthorizedException('Profilo psicologo non trovato');
    return this.postService.create(psych.id, dto);
  }

  @Get('psychologist/:psychologistId')
  findByPsychologist(@Param('psychologistId') psychologistId: string) {
    return this.postService.findByPsychologist(psychologistId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const psych = await this.psychologistService.findByUserId(req.user.userId);
    if (!psych) throw new UnauthorizedException();
    return this.postService.remove(id, psych.id);
  }
}
