import { Controller, Get } from '@nestjs/common';
import { TAXONOMY } from './taxonomy';

@Controller('specializations')
export class SpecializationController {
  @Get('taxonomy')
  getTaxonomy() {
    return TAXONOMY;
  }
}
