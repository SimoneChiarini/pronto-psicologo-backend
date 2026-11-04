import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { UpdatePsychologistDto } from './dto/update-psychologist.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { AccountService } from '../account/account.service';

@Controller('psychologists')
export class PsychologistController {
  constructor(
    private readonly psychologistService: PsychologistService,
    private readonly accountService: AccountService,
  ) {}

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

  // Prima di ':id', altrimenti "me" verrebbe preso come id
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(@Request() req) {
    if (req.user.role !== 'PSYCHOLOGIST') throw new ForbiddenException();
    return this.psychologistService.findMine(req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.psychologistService.findPublic(id, req.user);
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
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    // Elimina l'intero account (non solo il profilo: un utente PSYCHOLOGIST senza
    // profilo resterebbe inutilizzabile) passando dalla procedura completa
    return this.accountService.deletePsychologistByAdmin(req.user.userId, id);
  }
}
