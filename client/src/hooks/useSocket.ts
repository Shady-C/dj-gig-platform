import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(): Socket {
  const [socket] = useState(() =>
    io(import.meta.env.VITE_SOCKET_URL as string, {
      autoConnect: true,
    })
  );

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}
