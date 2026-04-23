import { Controller, Get, Patch, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdmin(req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
  }

  @Get('settings')
  getSettings(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Request() req, @Body() body: { radiusKm?: number; expandMinutes?: number; maxAnswers?: number }) {
    this.checkAdmin(req);
    return this.adminService.updateSettings(body);
  }

  @Get('questions')
  getAllQuestions(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getAllQuestions();
  }

  @Get('conversations')
  getAllConversations(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getAllConversations();
  }

  @Get('conversations/:id/messages')
  getConversationMessages(@Request() req, @Param('id') id: string) {
    this.checkAdmin(req);
    return this.adminService.getConversationMessages(id);
  }

  @Get('users')
  getAllUsers(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getAllUsers();
  }

  @Get('psychologists')
  getAllPsychologists(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getAllPsychologists();
  }

  @Get('answers')
  getAllAnswers(@Request() req) {
    this.checkAdmin(req);
    return this.adminService.getAllAnswers();
  }
}
