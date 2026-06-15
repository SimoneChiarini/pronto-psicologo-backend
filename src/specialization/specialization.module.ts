import { Module } from '@nestjs/common';
import { SpecializationController } from './specialization.controller';

@Module({ controllers: [SpecializationController] })
export class SpecializationModule {}
