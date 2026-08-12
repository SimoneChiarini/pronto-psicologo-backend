import { Module } from '@nestjs/common';
import { AlboVerificationService } from './albo-verification.service';

@Module({
  providers: [AlboVerificationService],
  exports: [AlboVerificationService],
})
export class AlboModule {}
