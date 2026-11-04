import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportService } from '../report/report.service';
import { VerifiedPsychologistGuard } from './verified-psychologist.guard';
import { PeerService } from './peer.service';
import {
  CreateCaseDto, CreateCaseMessageDto, CreateGroupDto, CreateMeetingDto, InviteDto, JoinGroupDto,
  UpdateCaseDto, UpdateGroupDto,
} from './dto/peer.dto';
import { CaseMessageReportDto } from '../report/dto/create-report.dto';

/** Area professionisti — intervisioni. Solo psicologi verificati con abbonamento attivo. */
@UseGuards(JwtAuthGuard, VerifiedPsychologistGuard)
@Controller('pro')
export class PeerController {
  constructor(private readonly peer: PeerService, private readonly reports: ReportService) {}

  /** Il client lo usa per sapere se mostrare l'area (403 PRO_AREA_LOCKED altrimenti). */
  @Get('access')
  access(@Request() req) {
    return { ok: true, psychologistId: req.psych.id };
  }

  // ── Gruppi ────────────────────────────────────────────────

  @Get('groups')
  list(@Request() req, @Query('scope') scope?: string, @Query('q') q?: string) {
    return scope === 'discover' ? this.peer.discover(req.psych.id, q?.trim()) : this.peer.listMine(req.psych.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('groups')
  create(@Body() dto: CreateGroupDto, @Request() req) {
    return this.peer.create(req.psych.id, dto);
  }

  @Get('invitations')
  invitations(@Request() req) {
    return this.peer.invitations(req.psych.id);
  }

  @Get('colleagues')
  colleagues(@Request() req, @Query('q') q = '', @Query('groupId') groupId?: string) {
    return this.peer.searchColleagues(req.psych.id, q, groupId);
  }

  @Get('groups/:id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.peer.detail(id, req.psych.id);
  }

  @Patch('groups/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto, @Request() req) {
    return this.peer.update(id, req.psych.id, dto);
  }

  @Post('groups/:id/archive')
  @HttpCode(200)
  archive(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.peer.archive(id, req.psych.id);
  }

  @Post('groups/:id/join')
  @HttpCode(200)
  join(@Param('id', ParseUUIDPipe) id: string, @Body() _dto: JoinGroupDto, @Request() req) {
    return this.peer.join(id, req.psych.id);
  }

  @Post('groups/:id/decline')
  @HttpCode(200)
  decline(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.peer.declineInvite(id, req.psych.id);
  }

  @Post('groups/:id/leave')
  @HttpCode(200)
  leave(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.peer.leave(id, req.psych.id);
  }

  @Post('groups/:id/invite')
  @HttpCode(200)
  invite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: InviteDto, @Request() req) {
    return this.peer.invite(id, req.psych.id, dto.psychologistId);
  }

  @Post('groups/:id/members/:psychId/approve')
  @HttpCode(200)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('psychId', ParseUUIDPipe) psychId: string,
    @Request() req,
  ) {
    return this.peer.approve(id, req.psych.id, psychId);
  }

  @Post('groups/:id/members/:psychId/moderator')
  @HttpCode(200)
  setModerator(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('psychId', ParseUUIDPipe) psychId: string,
    @Body() body: { moderator?: boolean },
    @Request() req,
  ) {
    return this.peer.setModerator(id, req.psych.id, psychId, body?.moderator === true);
  }

  @Delete('groups/:id/members/:psychId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('psychId', ParseUUIDPipe) psychId: string,
    @Request() req,
  ) {
    return this.peer.removeMember(id, req.psych.id, psychId);
  }

  // ── Casi ──────────────────────────────────────────────────

  @Get('groups/:id/cases')
  cases(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.peer.listCases(id, req.psych.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('groups/:id/cases')
  createCase(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCaseDto, @Request() req) {
    return this.peer.createCase(id, req.psych.id, dto);
  }

  @Get('cases/:caseId')
  caseDetail(@Param('caseId', ParseUUIDPipe) caseId: string, @Request() req) {
    return this.peer.caseDetail(caseId, req.psych.id);
  }

  @Patch('cases/:caseId')
  updateCase(@Param('caseId', ParseUUIDPipe) caseId: string, @Body() dto: UpdateCaseDto, @Request() req) {
    return this.peer.updateCase(caseId, req.psych.id, dto);
  }

  @Delete('cases/:caseId')
  deleteCase(@Param('caseId', ParseUUIDPipe) caseId: string, @Request() req) {
    return this.peer.deleteCase(caseId, req.psych.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @Post('cases/:caseId/messages')
  postMessage(@Param('caseId', ParseUUIDPipe) caseId: string, @Body() dto: CreateCaseMessageDto, @Request() req) {
    return this.peer.postMessage(caseId, req.psych.id, dto);
  }

  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Request() req) {
    return this.peer.deleteMessage(messageId, req.psych.id);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('messages/:messageId/report')
  reportMessage(@Param('messageId', ParseUUIDPipe) messageId: string, @Body() dto: CaseMessageReportDto, @Request() req) {
    return this.reports.createForCaseMessage(req.user.userId, req.psych.id, messageId, dto);
  }

  // ── Incontri ──────────────────────────────────────────────

  @Post('groups/:id/meetings')
  createMeeting(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMeetingDto, @Request() req) {
    return this.peer.createMeeting(id, req.psych.id, dto);
  }

  @Delete('meetings/:meetingId')
  deleteMeeting(@Param('meetingId', ParseUUIDPipe) meetingId: string, @Request() req) {
    return this.peer.deleteMeeting(meetingId, req.psych.id);
  }
}
