import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { env } from '../config/env';
import Event, { EventStatus } from '../models/Event';
import { requireAdmin } from '../middleware/auth';
import { emitToEvent } from '../socket/handlers';
import { slugify } from '../utils/slug';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

const eventStatuses: EventStatus[] = ['draft', 'published', 'live', 'ended'];

function eventScope(req: Request) {
  if (req.user?.role === 'admin') return {};
  return { ownerId: req.user?.sub };
}

function normalizeEventBody(body: Record<string, unknown>, ownerId?: string) {
  const update: Record<string, unknown> = { ...body };
  delete update.ownerId;
  delete update._id;

  if (typeof update.eventName === 'string' && !update.slug) {
    update.slug = slugify(update.eventName);
  }
  if (typeof update.slug === 'string') {
    update.slug = slugify(update.slug);
  }
  if (typeof update.isLive === 'boolean') {
    update.status = update.isLive ? 'live' : 'published';
    delete update.isLive;
  }
  if (ownerId) {
    update.ownerId = new mongoose.Types.ObjectId(ownerId);
  }
  return update;
}

export function createEventsRouter(io: Server): Router {
  const router = Router();

  router.get('/gigs/:slug', async (req: Request<{ slug: string }>, res: Response) => {
    const event = await Event.findOne({ slug: req.params.slug });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(event);
  });

  router.get('/admin/events', requireAdmin, async (req: Request, res: Response) => {
    const events = await Event.find(eventScope(req)).sort({ date: -1 });
    res.json(events);
  });

  router.post('/admin/events', requireAdmin, async (req: Request, res: Response) => {
    const payload = normalizeEventBody(req.body as Record<string, unknown>, req.user?.sub);
    const event = await Event.create(payload);
    res.status(201).json(event);
  });

  router.get('/admin/events/:eventId', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const event = await Event.findOne({ _id: req.params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(event);
  });

  router.patch('/admin/events/:eventId', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const { eventId } = req.params;
    const patch = normalizeEventBody(req.body as Record<string, unknown>);
    const event = await Event.findOneAndUpdate(
      { _id: eventId, ...eventScope(req) },
      patch,
      { new: true, runValidators: true }
    );
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    emitToEvent(io, eventId, 'event:updated', patch);
    res.json(event);
  });

  router.patch('/admin/events/:eventId/status', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const { eventId } = req.params;
    const { status } = req.body as { status?: EventStatus };
    if (!status || !eventStatuses.includes(status)) {
      res.status(400).json({ error: 'status must be draft, published, live, or ended' });
      return;
    }
    const event = await Event.findOneAndUpdate(
      { _id: eventId, ...eventScope(req) },
      { status },
      { new: true, runValidators: true }
    );
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    emitToEvent(io, eventId, 'event:status-changed', { status });
    res.json(event);
  });

  router.patch('/admin/events/:eventId/live', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const { eventId } = req.params;
    const { isLive } = req.body as { isLive?: boolean };
    if (typeof isLive !== 'boolean') {
      res.status(400).json({ error: 'isLive must be a boolean' });
      return;
    }
    const status = isLive ? 'live' : 'published';
    const event = await Event.findOneAndUpdate(
      { _id: eventId, ...eventScope(req) },
      { status },
      { new: true, runValidators: true }
    );
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    emitToEvent(io, eventId, 'event:status-changed', { status });
    res.json(event);
  });

  router.post(
    '/admin/events/:eventId/hero',
    requireAdmin,
    upload.single('image'),
    async (req: Request<{ eventId: string }>, res: Response) => {
      const { eventId } = req.params;
      if (!req.file) {
        res.status(400).json({ error: 'Image file required' });
        return;
      }

      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'dj-gig-platform/heroes' },
          (error, result) => {
            if (error || !result) reject(error ?? new Error('Upload failed'));
            else resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });

      const event = await Event.findOneAndUpdate(
        { _id: eventId, ...eventScope(req) },
        { heroImageUrl: result.secure_url },
        { new: true }
      );
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      emitToEvent(io, eventId, 'event:updated', { heroImageUrl: result.secure_url });
      res.json(event);
    }
  );

  return router;
}
