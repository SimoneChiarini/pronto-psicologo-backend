import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  private checkAdmin(req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post()
  create(@Body() dto: CreateReportDto, @Request() req) {
    return this.reportService.create(req.user.userId, req.user.role, dto);
  }

  @Get()
  findAll(@Request() req, @Query('status') status?: string) {
    this.checkAdmin(req);
    return this.reportService.findAll(status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReportDto, @Request() req) {
    this.checkAdmin(req);
    return this.reportService.update(id, dto);
  }
}
