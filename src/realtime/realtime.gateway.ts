import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowedOrigin } from '../common/cors';
import { RealtimeService } from './realtime.service';

type SocketUser = { userId: string; role: string; psychId: string | null };

/**
 * WebSocket (Socket.IO) per aggiornamenti in tempo reale.
 * - Autenticazione: JWT nel handshake (`auth.token`), stesso token delle API.
 * - Ogni socket entra in `user:<userId>` (notifiche personali).
 * - Il client si iscrive alle stanze `conv:<id>` (chat) e `case:<id>` (discussioni
 *   di gruppo) con l'evento `subscribe`; il server verifica l'accesso.
 * Gli eventi contengono solo id: il client ricarica i dati via API, così i
 * controlli di autorizzazione restano in un unico posto.
 */
// Il ThrottlerGuard globale è pensato per HTTP (legge l'IP dalla request)
@SkipThrottle()
@WebSocketGateway({
  cors: { origin: (origin: string | undefined, cb: (e: Error | null, ok?: boolean) => void) => cb(null, isAllowedOrigin(origin)) },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwt = new JwtService({ secret: process.env.JWT_SECRET });

  @WebSocketServer() server: Server;

  constructor(private prisma: PrismaService, private realtime: RealtimeService) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(socket: Socket) {
    // Il client può mandare "subscribe" subito dopo la connessione, prima che la
    // verifica del token sia finita: gli handler aspettano questa promessa.
    let done!: () => void;
    socket.data.ready = new Promise<void>(r => (done = r));
    try {
      const token = (socket.handshake.auth?.token as string | undefined)
        ?? (socket.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
      if (!token) throw new Error('token mancante');
      const payload = await this.jwt.verifyAsync(token);
      const psych = payload.role === 'PSYCHOLOGIST'
        ? await this.prisma.psychologist.findUnique({ where: { userId: payload.sub }, select: { id: true } })
        : null;
      const user: SocketUser = { userId: payload.sub, role: payload.role, psychId: psych?.id ?? null };
      socket.data.user = user;
      await socket.join(`user:${user.userId}`);
      this.realtime.markOnline(user.userId, socket.id);
    } catch {
      socket.emit('auth_error', { message: 'Sessione non valida' });
      socket.disconnect(true);
    } finally {
      done();
    }
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data.user as SocketUser | undefined;
    if (user) this.realtime.markOffline(user.userId, socket.id);
  }

  @SubscribeMessage('subscribe')
  async subscribe(@ConnectedSocket() socket: Socket, @MessageBody() body: { type?: string; id?: string }) {
    await socket.data.ready;
    const user = socket.data.user as SocketUser | undefined;
    if (!user || !body?.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return { ok: false };
    const allowed = body.type === 'conversation'
      ? await this.canAccessConversation(user, body.id)
      : body.type === 'case'
        ? await this.canAccessCase(user, body.id)
        : false;
    if (!allowed) return { ok: false };
    await socket.join(`${body.type === 'conversation' ? 'conv' : 'case'}:${body.id}`);
    return { ok: true };
  }

  @SubscribeMessage('unsubscribe')
  async unsubscribe(@ConnectedSocket() socket: Socket, @MessageBody() body: { type?: string; id?: string }) {
    if (!body?.id) return { ok: false };
    await socket.leave(`${body.type === 'conversation' ? 'conv' : 'case'}:${body.id}`);
    return { ok: true };
  }

  private async canAccessConversation(user: SocketUser, conversationId: string) {
    const c = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, psychologistId: true },
    });
    return !!c && (c.userId === user.userId || (!!user.psychId && c.psychologistId === user.psychId));
  }

  private async canAccessCase(user: SocketUser, caseId: string) {
    if (!user.psychId) return false;
    const c = await this.prisma.caseDiscussion.findUnique({ where: { id: caseId }, select: { groupId: true } });
    if (!c) return false;
    const m = await this.prisma.peerGroupMember.findUnique({
      where: { groupId_psychologistId: { groupId: c.groupId, psychologistId: user.psychId } },
      select: { status: true },
    });
    return m?.status === 'ACTIVE';
  }
}
