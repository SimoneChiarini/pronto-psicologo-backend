import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerifiedPsychologistGuard } from './verified-psychologist.guard';
import { SupervisionService } from './supervision.service';
import { CreateSupervisionDto, RespondDto, UpsertSupervisorProfileDto } from './dto/supervision.dto';

/** Area professionisti — supervisioni. Solo psicologi verificati con abbonamento attivo. */
@UseGuards(JwtAuthGuard, VerifiedPsychologistGuard)
@Controller('pro')
export class SupervisionController {
  constructor(private readonly supervision: SupervisionService) {}

  // ── Profilo supervisore ───────────────────────────────────

  @Get('supervisor-profile')
  myProfile(@Request() req) {
    return this.supervision.getMyProfile(req.psych.id);
  }

  @Put('supervisor-profile')
  upsertProfile(@Body() dto: UpsertSupervisorProfileDto, @Request() req) {
    return this.supervision.upsertMyProfile(req.psych.id, dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('supervisor-profile/connect')
  @HttpCode(200)
  connect(@Request() req) {
    return this.supervision.connectOnboarding(req.psych.id, req.user.userId);
  }

  @Post('supervisor-profile/dashboard')
  @HttpCode(200)
  dashboard(@Request() req) {
    return this.supervision.connectDashboard(req.psych.id);
  }

  @Get('supervisors')
  supervisors(@Request() req, @Query('q') q?: string) {
    return this.supervision.listSupervisors(req.psych.id, q);
  }

  // ── Supervisioni ──────────────────────────────────────────

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('supervisions')
  create(@Body() dto: CreateSupervisionDto, @Request() req) {
    return this.supervision.create(req.psych.id, dto);
  }

  @Get('supervisions')
  list(@Request() req) {
    return this.supervision.list(req.psych.id);
  }

  @Get('supervisions/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.supervision.detail(id, req.psych.id);
  }

  @Post('supervisions/:id/respond')
  @HttpCode(200)
  respond(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RespondDto, @Request() req) {
    return this.supervision.respond(id, req.psych.id, dto.accept);
  }

  @Post('supervisions/:id/participation')
  @HttpCode(200)
  participation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RespondDto, @Request() req) {
    return this.supervision.setParticipation(id, req.psych.id, dto.accept);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('supervisions/:id/checkout')
  @HttpCode(200)
  checkout(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.supervision.checkout(id, req.psych.id, req.user.userId);
  }

  @Post('supervisions/:id/complete')
  @HttpCode(200)
  complete(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.supervision.complete(id, req.psych.id);
  }

  @Post('supervisions/:id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.supervision.cancel(id, req.psych.id);
  }
}
