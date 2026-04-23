import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() data: CreateReviewDto, @Request() req) {
    return this.reviewService.create({ ...data, userId: req.user.userId });
  }

  @Get()
  findAll() {
    return this.reviewService.findAll();
  }

  @Get('psychologist/:psychologistId')
  findByPsychologist(@Param('psychologistId') psychologistId: string) {
    return this.reviewService.findByPsychologist(psychologistId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const review = await this.reviewService.findOne(id);
    if (review?.userId !== req.user.userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }
    return this.reviewService.remove(id);
  }
}
