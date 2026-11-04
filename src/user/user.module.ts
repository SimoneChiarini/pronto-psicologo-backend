import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountModule } from '../account/account.module';

@Module({
  imports: [PrismaModule, AccountModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
