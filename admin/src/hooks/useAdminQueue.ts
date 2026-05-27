import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getRequests, updateRequestStatus, bulkUpdateStatus, deleteRequest } from '../api';
import type { ISongRequest } from '../api';

export function useAdminQueue(eventId: string, socket: Socket) {
  const [requests, setRequests] = useState<ISongRequest[]>([]);

  const sortByVotes = (list: ISongRequest[]) => [...list].sort((a, b) => b.voteCount - a.voteCount);

  useEffect(() => {
    getRequests(eventId).then((data) => setRequests(sortByVotes(data))).catch(console.error);
  }, [eventId]);

  useEffect(() => {
    const onNew = (req: ISongRequest) => setRequests((prev) => sortByVotes([...prev, req]));
    const onVoted = ({ _id, voteCount, votes }: { _id: string; voteCount?: number; votes?: number }) =>
      setRequests((prev) =>
        sortByVotes(prev.map((r) => (r._id === _id ? { ...r, voteCount: voteCount ?? votes ?? r.voteCount } : r)))
      );
    const onStatusChanged = (payload: { _id?: string; status?: ISongRequest['status']; bulk?: boolean }) => {
      if (payload.bulk) {
        getRequests(eventId).then((data) => setRequests(sortByVotes(data))).catch(console.error);
      } else if (payload._id && payload.status) {
        setRequests((prev) =>
          sortByVotes(prev.map((r) => (r._id === payload._id ? { ...r, status: payload.status! } : r)))
        );
      }
    };
    socket.on('request:new', onNew);
    socket.on('request:voted', onVoted);
    socket.on('request:status-changed', onStatusChanged);
    return () => {
      socket.off('request:new', onNew);
      socket.off('request:voted', onVoted);
      socket.off('request:status-changed', onStatusChanged);
    };
  }, [socket, eventId]);

  const setStatus = useCallback(
    async (reqId: string, status: ISongRequest['status']) => {
      const updated = await updateRequestStatus(eventId, reqId, status);
      setRequests((prev) => sortByVotes(prev.map((r) => (r._id === reqId ? updated : r))));
    },
    [eventId]
  );

  const bulkStatus = useCallback(
    async (status: ISongRequest['status'], filter: ISongRequest['status']) => {
      const updated = await bulkUpdateStatus(eventId, status, filter);
      setRequests(sortByVotes(updated));
    },
    [eventId]
  );

  const remove = useCallback(
    async (reqId: string) => {
      await deleteRequest(eventId, reqId);
      setRequests((prev) => prev.filter((r) => r._id !== reqId));
    },
    [eventId]
  );

  return { requests, setStatus, bulkStatus, remove };
}
