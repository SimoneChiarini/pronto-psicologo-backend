import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { UpdatePsychologistDto } from './dto/update-psychologist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('psychologists')
export class PsychologistController {
  constructor(private readonly psychologistService: PsychologistService) {}

  // Richiede auth per prevenire abuso della API key Anthropic
  @UseGuards(JwtAuthGuard)
  @Post('ai-rank')
  aiRank(@Body() body: { query: string }) {
    return this.psychologistService.aiRank(body.query ?? '');
  }

  @Get()
  findAll() {
    return this.psychologistService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.psychologistService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdatePsychologistDto, @Request() req) {
    if (req.user.role === 'ADMIN') {
      return this.psychologistService.update(id, data);
    }
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    const own = await this.psychologistService.findByUserId(req.user.userId);
    if (!own || own.id !== id) throw new ForbiddenException('Puoi modificare solo il tuo profilo');
    return this.psychologistService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.psychologistService.remove(id);
  }
}
