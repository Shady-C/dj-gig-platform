import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthPayload } from '../middleware/auth';

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('join-public-event', (eventId: string) => {
      socket.join(publicEventRoom(eventId));
    });

    socket.on('leave-public-event', (eventId: string) => {
      socket.leave(publicEventRoom(eventId));
    });

    socket.on('join-admin-event', (eventId: string) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') {
        socket.emit('admin:error', { error: 'Missing socket auth token' });
        return;
      }

      try {
        jwt.verify(token, env.JWT_SECRET) as AuthPayload;
        socket.join(adminEventRoom(eventId));
      } catch {
        socket.emit('admin:error', { error: 'Invalid socket auth token' });
      }
    });

    socket.on('leave-admin-event', (eventId: string) => {
      socket.leave(adminEventRoom(eventId));
    });
  });
}

export function emitToEvent(
  io: Server,
  eventId: string,
  event: string,
  payload: unknown
): void {
  io.to(publicEventRoom(eventId)).to(adminEventRoom(eventId)).emit(event, payload);
}

export function emitToAdminEvent(
  io: Server,
  eventId: string,
  event: string,
  payload: unknown
): void {
  io.to(adminEventRoom(eventId)).emit(event, payload);
}

function publicEventRoom(eventId: string): string {
  return `public:event:${eventId}`;
}

function adminEventRoom(eventId: string): string {
  return `admin:event:${eventId}`;
}
