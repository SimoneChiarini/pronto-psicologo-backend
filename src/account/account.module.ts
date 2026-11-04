import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { StorageModule } from '../storage/storage.module';
import { AccountService } from './account.service';
import { AccountExportService } from './account-export.service';
import { AccountController } from './account.controller';

@Module({
  imports: [PrismaModule, BillingModule, StorageModule],
  providers: [AccountService, AccountExportService],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
