import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getEvent } from '../api';
import type { IEvent } from '../api';

export function useEvent(slug: string, socket: Socket) {
  const [event, setEvent] = useState<IEvent | null>(null);

  useEffect(() => {
    getEvent(slug).then(setEvent).catch(console.error);
  }, [slug]);

  useEffect(() => {
    if (event?._id) socket.emit('join-public-event', event._id);
  }, [event?._id, socket]);

  useEffect(() => {
    const onUpdated = (patch: Partial<IEvent>) => {
      setEvent((prev) => (prev ? { ...prev, ...patch } : prev));
    };
    const onStatusChanged = ({ status }: { status: IEvent['status'] }) => {
      setEvent((prev) => (prev ? { ...prev, status } : prev));
    };

    socket.on('event:updated', onUpdated);
    socket.on('event:status-changed', onStatusChanged);
    return () => {
      socket.off('event:updated', onUpdated);
      socket.off('event:status-changed', onStatusChanged);
    };
  }, [socket]);

  return { event };
}
