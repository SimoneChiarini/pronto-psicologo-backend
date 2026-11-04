import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { NotificationService } from './notification.service';

/** Globale: chat, gruppi e supervisioni possono emettere eventi e notifiche. */
@Global()
@Module({
  imports: [PrismaModule, FirebaseModule],
  providers: [RealtimeGateway, RealtimeService, NotificationService],
  exports: [RealtimeService, NotificationService],
})
export class RealtimeModule {}
