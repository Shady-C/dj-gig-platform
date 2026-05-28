import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import SongRequest, { RequestStatus } from '../models/SongRequest';
import Vote from '../models/Vote';
import Event from '../models/Event';
import { requireAdmin } from '../middleware/auth';
import { emitToEvent } from '../socket/handlers';
import { hashIdentifier } from '../utils/hash';

type GigParams = { slug: string; requestId?: string };
type AdminParams = { eventId: string; requestId?: string };

const requestStatuses: RequestStatus[] = ['pending', 'approved', 'played', 'rejected'];

const submitRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many song requests, please try again later' },
});

const voteRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many votes, please try again later' },
});

function eventScope(req: Request) {
  if (req.user?.role === 'admin') return {};
  return { ownerId: req.user?.sub };
}

function getSessionId(req: Request): string | null {
  const header = req.headers['x-session-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : null;
}

function getIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip ?? 'unknown';
}

export function createRequestsRouter(io: Server): Router {
  const router = Router();

  router.get('/gigs/:slug/requests', async (req: Request<GigParams>, res: Response) => {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const requests = await SongRequest.find({ eventId: event._id }).sort({ voteCount: -1 });
    res.json(requests);
  });

  router.post('/gigs/:slug/requests', submitRateLimit, async (req: Request<GigParams>, res: Response) => {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: 'x-session-id header is required' });
      return;
    }

    const sessionIdHash = hashIdentifier(sessionId);
    const ipHash = hashIdentifier(getIp(req));

    try {
      const songRequest = await SongRequest.create({
        ...req.body,
        eventId: event._id,
        voteCount: 1,
        requestedBySessionId: sessionIdHash,
      });
      await Vote.create({
        eventId: event._id,
        songRequestId: songRequest._id,
        sessionIdHash,
        ipHash,
      });
      emitToEvent(io, event._id.toString(), 'request:new', songRequest);
      res.status(201).json(songRequest);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: unknown }).code === 11000
      ) {
        const existing = await SongRequest.findOne({
          eventId: event._id,
          itunesTrackId: (req.body as { itunesTrackId: number }).itunesTrackId,
        });
        res.status(409).json(existing);
        return;
      }
      throw err;
    }
  });

  router.post('/gigs/:slug/requests/:requestId/vote', voteRateLimit, async (req: Request<GigParams>, res: Response) => {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const sessionId = getSessionId(req);
    if (!sessionId) {
      res.status(400).json({ error: 'x-session-id header is required' });
      return;
    }

    const songRequest = await SongRequest.findOne({ _id: req.params.requestId, eventId: event._id });
    if (!songRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const sessionIdHash = hashIdentifier(sessionId);
    try {
      await Vote.create({
        eventId: event._id,
        songRequestId: songRequest._id,
        sessionIdHash,
        ipHash: hashIdentifier(getIp(req)),
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: unknown }).code === 11000
      ) {
        res.status(409).json({ error: 'Session has already voted for this request' });
        return;
      }
      throw err;
    }

    songRequest.voteCount += 1;
    await songRequest.save();
    emitToEvent(io, event._id.toString(), 'request:voted', {
      _id: songRequest._id,
      voteCount: songRequest.voteCount,
      votes: songRequest.voteCount,
    });
    res.json(songRequest);
  });

  router.get('/admin/events/:eventId/requests', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const event = await Event.findOne({ _id: req.params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const requests = await SongRequest.find({ eventId: req.params.eventId }).sort({ voteCount: -1 });
    res.json(requests);
  });

  router.patch('/admin/events/:eventId/requests/bulk-status', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const { eventId } = req.params;
    const { status, filter } = req.body as { status?: RequestStatus; filter?: RequestStatus };
    if (!status || !filter || !requestStatuses.includes(status) || !requestStatuses.includes(filter)) {
      res.status(400).json({ error: 'valid status and filter are required' });
      return;
    }
    const event = await Event.findOne({ _id: eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    await SongRequest.updateMany({ eventId, status: filter }, { status });
    const updated = await SongRequest.find({ eventId }).sort({ voteCount: -1 });
    emitToEvent(io, eventId, 'request:status-changed', { bulk: true, status, filter });
    res.json(updated);
  });

  router.patch('/admin/events/:eventId/requests/:requestId/status', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const { eventId, requestId } = req.params;
    const { status } = req.body as { status?: RequestStatus };
    if (!status || !requestStatuses.includes(status)) {
      res.status(400).json({ error: 'valid status is required' });
      return;
    }
    const event = await Event.findOne({ _id: eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const songRequest = await SongRequest.findOneAndUpdate(
      { _id: requestId, eventId },
      { status },
      { new: true }
    );
    if (!songRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    emitToEvent(io, eventId, 'request:status-changed', { _id: songRequest._id, status: songRequest.status });
    res.json(songRequest);
  });

  router.delete('/admin/events/:eventId/requests/:requestId', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const { eventId, requestId } = req.params;
    const event = await Event.findOne({ _id: eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const songRequest = await SongRequest.findOneAndDelete({ _id: requestId, eventId });
    if (!songRequest) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    await Vote.deleteMany({ songRequestId: requestId });
    res.status(204).send();
  });

  return router;
}
