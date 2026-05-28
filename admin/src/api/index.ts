import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const isNetworkError = (error: unknown) =>
  axios.isAxiosError(error) && !error.response;

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

export interface ITip {
  _id: string;
  eventId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  status: 'pending' | 'succeeded' | 'failed';
  createdAt: string;
}

export interface ITipSummary {
  total: number;
  count: number;
  average: number;
}

export const login = (email: string, password: string) =>
  api.post<{ token: string }>('/auth/login', { email, password }).then((r) => r.data);

export const listEvents = () =>
  api.get<IEvent[]>('/admin/events').then((r) => r.data);

export const createEvent = (data: Partial<IEvent>) =>
  api.post<IEvent>('/admin/events', data).then((r) => r.data);

export const getEvent = (id: string) =>
  api.get<IEvent>(`/admin/events/${id}`).then((r) => r.data);

export const updateEvent = (id: string, data: Partial<IEvent>) =>
  api.patch<IEvent>(`/admin/events/${id}`, data).then((r) => r.data);

export const toggleLive = (id: string, isLive: boolean) =>
  api.patch<IEvent>(`/admin/events/${id}/live`, { isLive }).then((r) => r.data);

export const uploadHero = (id: string, file: File) => {
  const form = new FormData();
  form.append('image', file);
  return api.post<IEvent>(`/admin/events/${id}/hero`, form).then((r) => r.data);
};

export const getRequests = (eventId: string) =>
  api.get<ISongRequest[]>(`/admin/events/${eventId}/requests`).then((r) => r.data);

export const updateRequestStatus = (
  eventId: string,
  reqId: string,
  status: ISongRequest['status']
) =>
  api.patch<ISongRequest>(`/admin/events/${eventId}/requests/${reqId}/status`, { status }).then((r) => r.data);

export const bulkUpdateStatus = (
  eventId: string,
  status: ISongRequest['status'],
  filter: ISongRequest['status']
) =>
  api.patch<ISongRequest[]>(`/admin/events/${eventId}/requests/bulk-status`, { status, filter }).then((r) => r.data);

export const deleteRequest = (eventId: string, reqId: string) =>
  api.delete(`/admin/events/${eventId}/requests/${reqId}`);

export const getTips = (eventId: string) =>
  api.get<ITip[]>(`/admin/events/${eventId}/tips`).then((r) => r.data);

export const getTipSummary = (eventId: string) =>
  api.get<ITipSummary>(`/admin/events/${eventId}/tips/summary`).then((r) => r.data);
