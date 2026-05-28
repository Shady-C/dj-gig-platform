import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getEvent, isNetworkError } from '../api';
import type { IEvent } from '../api';

export function useAdminEvent(eventId: string, socket: Socket) {
  const [event, setEvent] = useState<IEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvent(eventId);
      setEvent(data);
    } catch (err) {
      setEvent(null);
      setError(isNetworkError(err) ? 'Unable to reach the server.' : 'Unable to load the dashboard.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

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

  return { event, setEvent, loading, error, reload: loadEvent };
}
