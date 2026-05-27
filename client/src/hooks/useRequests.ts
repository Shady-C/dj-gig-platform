import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getRequests, voteRequest } from '../api';
import type { ISongRequest } from '../api';

export function useRequests(slug: string, socket: Socket, eventId?: string) {
  const [requests, setRequests] = useState<ISongRequest[]>([]);

  const sortByVotes = (list: ISongRequest[]) =>
    [...list].sort((a, b) => b.voteCount - a.voteCount);

  useEffect(() => {
    getRequests(slug).then((data) => setRequests(sortByVotes(data))).catch(console.error);
  }, [slug]);

  useEffect(() => {
    const onNew = (req: ISongRequest) => {
      setRequests((prev) => sortByVotes([...prev, req]));
    };
    const onVoted = ({ _id, voteCount, votes }: { _id: string; voteCount?: number; votes?: number }) => {
      setRequests((prev) =>
        sortByVotes(prev.map((r) => (r._id === _id ? { ...r, voteCount: voteCount ?? votes ?? r.voteCount } : r)))
      );
    };
    const onStatusChanged = ({ _id, status }: { _id: string; status: ISongRequest['status'] }) => {
      setRequests((prev) =>
        sortByVotes(prev.map((r) => (r._id === _id ? { ...r, status } : r)))
      );
    };

    socket.on('request:new', onNew);
    socket.on('request:voted', onVoted);
    socket.on('request:status-changed', onStatusChanged);
    return () => {
      socket.off('request:new', onNew);
      socket.off('request:voted', onVoted);
      socket.off('request:status-changed', onStatusChanged);
    };
  }, [socket]);

  const vote = useCallback(
    async (reqId: string) => {
      const updated = await voteRequest(slug, reqId);
      setRequests((prev) =>
        sortByVotes(prev.map((r) => (r._id === reqId ? updated : r)))
      );
    },
    [slug]
  );

  const addOrVote = useCallback(
    (req: ISongRequest) => {
      setRequests((prev) => {
        const existing = prev.find((r) => r._id === req._id);
        if (existing) return sortByVotes(prev.map((r) => (r._id === req._id ? req : r)));
        return sortByVotes([...prev, req]);
      });
    },
    []
  );

  useEffect(() => {
    if (eventId) socket.emit('join-public-event', eventId);
  }, [eventId, socket]);

  return { requests, vote, addOrVote };
}
