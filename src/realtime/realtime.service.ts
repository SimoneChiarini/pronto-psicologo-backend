import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Accesso al server Socket.IO dal resto dell'app + presenza online.
 * NB: la presenza è in memoria → valida con una sola istanza del backend.
 * Con più istanze servirebbe l'adapter Redis di Socket.IO.
 */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;
  private readonly online = new Map<string, Set<string>>(); // userId → socketId

  attach(server: Server) {
    this.server = server;
  }

  markOnline(userId: string, socketId: string) {
    const set = this.online.get(userId) ?? new Set<string>();
    set.add(socketId);
    this.online.set(userId, set);
  }

  markOffline(userId: string, socketId: string) {
    const set = this.online.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (!set.size) this.online.delete(userId);
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }

  toUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  toConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conv:${conversationId}`).emit(event, payload);
  }

  toCase(caseId: string, event: string, payload: unknown) {
    this.server?.to(`case:${caseId}`).emit(event, payload);
  }
}
