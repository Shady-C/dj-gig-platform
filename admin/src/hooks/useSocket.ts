import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

export function useSocket(eventId: string): Socket {
  const token = useAuthStore.getState().token;
  const [socket] = useState(() =>
    io(import.meta.env.VITE_SOCKET_URL as string, {
      autoConnect: true,
      auth: { token },
    })
  );

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (!eventId) return;

    const joinRoom = () => {
      socket.emit('join-admin-event', eventId);
    };

    if (socket.connected) {
      joinRoom();
    }
    socket.on('connect', joinRoom);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('leave-admin-event', eventId);
    };
  }, [eventId, socket]);

  return socket;
}
