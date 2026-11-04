import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { RealtimeService } from './realtime.service';

export type NotificationType =
  | 'message'            // nuovo messaggio in chat
  | 'case_new'           // nuovo caso in un gruppo
  | 'case_message'       // nuovo intervento in un caso che segui
  | 'group_request'      // richiesta di ingresso nel tuo gruppo
  | 'group_invite'       // sei stato invitato in un gruppo
  | 'group_approved'     // la tua richiesta è stata accettata
  | 'meeting'            // nuovo incontro in videochiamata
  | 'supervision';       // aggiornamenti su una supervisione

export interface AppNotification {
  type: NotificationType;
  title: string;
  body: string;
  // id utili al client per aprire la schermata giusta
  conversationId?: string;
  groupId?: string;
  caseId?: string;
  supervisionId?: string;
}

/**
 * Recapito notifiche: se l'utente ha l'app aperta (socket connesso) arriva un
 * evento in tempo reale, altrimenti una push FCM.
 * PRIVACY: titolo e testo non contengono mai il contenuto dei messaggi o dei
 * casi (finirebbero sulla schermata di blocco): solo chi e dove.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
    private realtime: RealtimeService,
  ) {}

  /** Best-effort: non lancia mai, non deve far fallire l'operazione che la genera. */
  notifyUsers(userIds: (string | null | undefined)[], n: AppNotification, exceptUserId?: string): void {
    const targets = [...new Set(userIds.filter((u): u is string => !!u && u !== exceptUserId))];
    if (!targets.length) return;
    void this.deliver(targets, n).catch(e => this.logger.warn(`Notifica non recapitata: ${e.message}`));
  }

  /** Come notifyUsers, partendo da id di profili psicologo. */
  notifyPsychologists(psychIds: (string | null | undefined)[], n: AppNotification, exceptPsychId?: string): void {
    const ids = [...new Set(psychIds.filter((p): p is string => !!p && p !== exceptPsychId))];
    if (!ids.length) return;
    void this.prisma.psychologist
      .findMany({ where: { id: { in: ids } }, select: { userId: true } })
      .then(rows => this.notifyUsers(rows.map(r => r.userId), n))
      .catch(e => this.logger.warn(`Notifica non recapitata: ${e.message}`));
  }

  private async deliver(userIds: string[], n: AppNotification) {
    const offline: string[] = [];
    for (const id of userIds) {
      if (this.realtime.isOnline(id)) this.realtime.toUser(id, 'notification', n);
      else offline.push(id);
    }
    if (!offline.length) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: offline }, fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });
    const data: Record<string, string> = Object.fromEntries(
      Object.entries({ type: n.type, conversationId: n.conversationId, groupId: n.groupId, caseId: n.caseId, supervisionId: n.supervisionId })
        .filter(([, v]) => !!v) as [string, string][],
    );
    await Promise.all(users.map(async u => {
      const ok = await this.firebase.sendToToken(u.fcmToken!, n.title, n.body, data);
      // Token scaduto o revocato: lo togliamo per non riprovare ogni volta
      if (!ok) await this.prisma.user.update({ where: { id: u.id }, data: { fcmToken: null } });
    }));
  }
}
