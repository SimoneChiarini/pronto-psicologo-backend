import { Controller, Get, Put, Delete, Param, Body, UseGuards, Request, ForbiddenException, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { AccountService } from '../account/account.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly accountService: AccountService,
  ) {}

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

  // Passa dalla procedura completa: disdetta Stripe, cascata, file, email
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.accountService.deleteByAdmin(req.user.userId, id);
  }
}
