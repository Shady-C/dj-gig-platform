import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
});

export interface IEvent {
  _id: string;
  slug: string;
  djName: string;
  eventName: string;
  tagline: string;
  genre: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venue: string;
  address: string;
  coverInfo: string;
  ticketLink: string;
  instagramLink: string;
  heroImageUrl: string;
  status: 'draft' | 'published' | 'live' | 'ended';
}

export interface ISongRequest {
  _id: string;
  eventId: string;
  song: string;
  artist: string;
  album: string;
  artworkUrl: string;
  duration: string;
  itunesTrackId: number;
  voteCount: number;
  votes?: number;
  status: 'pending' | 'approved' | 'played' | 'rejected';
  requestedAt: string;
}

export interface ITrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  trackTimeMillis: number;
  previewUrl: string;
}

function getSessionId(): string {
  const key = 'dj_session_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

const sessionHeaders = () => ({ 'x-session-id': getSessionId() });

export const getEvent = (slug: string) => api.get<IEvent>(`/gigs/${slug}`).then((r) => r.data);

export const getRequests = (slug: string) =>
  api.get<ISongRequest[]>(`/gigs/${slug}/requests`).then((r) => r.data);

export const submitRequest = (slug: string, track: Omit<ISongRequest, '_id' | 'eventId' | 'voteCount' | 'votes' | 'status' | 'requestedAt'>) =>
  api.post<ISongRequest>(`/gigs/${slug}/requests`, track, { headers: sessionHeaders() });

export const voteRequest = (slug: string, reqId: string) =>
  api.post<ISongRequest>(`/gigs/${slug}/requests/${reqId}/vote`, undefined, { headers: sessionHeaders() }).then((r) => r.data);

export const createTipIntent = (slug: string, amount: number) =>
  api.post<{ clientSecret: string }>(
    `/gigs/${slug}/tips/intent`,
    { amount, idempotencyKey: crypto.randomUUID() },
    { headers: sessionHeaders() }
  ).then((r) => r.data);

export const searchItunes = async (query: string): Promise<ITrack[]> => {
  const url = import.meta.env.VITE_ITUNES_SEARCH_URL as string;
  const res = await fetch(
    `${url}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=8`
  );
  const data = (await res.json()) as { results: ITrack[] };
  return data.results;
};

export const formatDuration = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
