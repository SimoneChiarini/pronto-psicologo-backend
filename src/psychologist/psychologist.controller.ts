import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PsychologistService } from './psychologist.service';
import { CreatePsychologistDto } from './dto/create-psychologist.dto';
import { UpdatePsychologistDto } from './dto/update-psychologist.dto';

@Controller('psychologists')
export class PsychologistController {
  constructor(private readonly psychologistService: PsychologistService) {}

  @Post()
  create(@Body() data: CreatePsychologistDto) {
    return this.psychologistService.create(data);
  }

  @Get()
  findAll() {
    return this.psychologistService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.psychologistService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdatePsychologistDto) {
    return this.psychologistService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.psychologistService.remove(id);
  }
}
