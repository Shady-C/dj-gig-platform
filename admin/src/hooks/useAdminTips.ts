import { useCallback, useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getTips, getTipSummary } from '../api';
import type { ITip, ITipSummary } from '../api';

export function useAdminTips(eventId: string, socket: Socket) {
  const [tips, setTips] = useState<ITip[]>([]);
  const [summary, setSummary] = useState<ITipSummary>({ total: 0, count: 0, average: 0 });

  const refresh = useCallback(() => {
    getTips(eventId).then(setTips).catch(console.error);
    getTipSummary(eventId).then(setSummary).catch(console.error);
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    socket.on('tip:received', refresh);
    return () => {
      socket.off('tip:received', refresh);
    };
  }, [socket, refresh]);

  return { tips, summary };
}
