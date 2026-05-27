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
    socket.emit('join-admin-event', eventId);
    return () => {
      socket.disconnect();
    };
  }, [eventId, socket]);

  return socket;
}
