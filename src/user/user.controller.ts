import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Request() req) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN' && req.user.userId !== id) throw new ForbiddenException();
    return this.userService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateUserDto, @Request() req) {
    if (req.user.role !== 'ADMIN' && req.user.userId !== id) throw new ForbiddenException();
    return this.userService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.userService.remove(id);
  }
}
