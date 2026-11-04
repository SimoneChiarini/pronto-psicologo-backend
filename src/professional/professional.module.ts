import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportModule } from '../report/report.module';
import { BillingModule } from '../billing/billing.module';
import { VerifiedPsychologistGuard } from './verified-psychologist.guard';
import { PeerService } from './peer.service';
import { PeerController } from './peer.controller';
import { SupervisionService } from './supervision.service';
import { SupervisionController } from './supervision.controller';

/** Area professionisti: intervisioni (tra pari) e supervisioni (a pagamento, Stripe Connect). */
@Module({
  imports: [PrismaModule, ReportModule, BillingModule],
  providers: [PeerService, SupervisionService, VerifiedPsychologistGuard],
  controllers: [PeerController, SupervisionController],
})
export class ProfessionalModule {}
