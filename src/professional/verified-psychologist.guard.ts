import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProPsych {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Area professionisti: accesso solo a psicologi verificati (albo) con
 * abbonamento attivo. Va usato DOPO JwtAuthGuard. Mette il profilo in req.psych.
 * Gli admin non passano: i casi clinici tra colleghi non sono consultabili
 * dalla piattaforma, salvo i messaggi segnalati.
 */
@Injectable()
export class VerifiedPsychologistGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.role !== 'PSYCHOLOGIST') {
      throw new ForbiddenException('Area riservata agli psicologi');
    }
    const p = await this.prisma.psychologist.findUnique({
      where: { userId: req.user.userId },
      select: {
        id: true, userId: true, verified: true, subscriptionActive: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!p || p.verified !== true || p.subscriptionActive !== true) {
      throw new ForbiddenException({
        code: 'PRO_AREA_LOCKED',
        message: 'Intervisioni e supervisioni sono disponibili per i profili verificati con abbonamento attivo.',
      });
    }
    req.psych = { id: p.id, userId: p.userId, firstName: p.user.firstName, lastName: p.user.lastName } satisfies ProPsych;
    return true;
  }
}
