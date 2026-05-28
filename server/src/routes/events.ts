import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env';
import Event, { EventStatus } from '../models/Event';
import { requireAdmin } from '../middleware/auth';
import { emitToEvent } from '../socket/handlers';
import { slugify } from '../utils/slug';
import { objectIdSchema, parseBody, parseParams } from '../utils/validation';

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

const eventParamsSchema = z.object({
  eventId: objectIdSchema,
});

const eventFieldSchema = {
  djName: z.string().trim().min(1).optional(),
  eventName: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  tagline: z.string().optional(),
  genre: z.string().optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().trim().min(1).optional(),
  endTime: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1).optional(),
  venue: z.string().trim().min(1).optional(),
  address: z.string().optional(),
  coverInfo: z.string().optional(),
  ticketLink: z.string().url().or(z.literal('')).optional(),
  instagramLink: z.string().url().or(z.literal('')).optional(),
  heroImageUrl: z.string().url().or(z.literal('')).optional(),
  status: z.enum(['draft', 'published', 'live', 'ended']).optional(),
  isLive: z.boolean().optional(),
};

const createEventSchema = z.object(eventFieldSchema).extend({
  djName: z.string().trim().min(1),
  eventName: z.string().trim().min(1),
  date: z.coerce.date(),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  venue: z.string().trim().min(1),
}).strict();

const updateEventSchema = z.object(eventFieldSchema).strict().refine(
  (value) => Object.keys(value).length > 0,
  'at least one field is required'
);

const eventStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'live', 'ended']),
}).strict();

const eventLiveSchema = z.object({
  isLive: z.boolean(),
}).strict();

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
    const body = parseBody(createEventSchema, req.body, res);
    if (!body) return;
    const payload = normalizeEventBody(body, req.user?.sub);
    const event = await Event.create(payload);
    res.status(201).json(event);
  });

  router.get('/admin/events/:eventId', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const params = parseParams(eventParamsSchema, req.params, res);
    if (!params) return;
    const event = await Event.findOne({ _id: params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json(event);
  });

  router.patch('/admin/events/:eventId', requireAdmin, async (req: Request<{ eventId: string }>, res: Response) => {
    const params = parseParams(eventParamsSchema, req.params, res);
    const body = parseBody(updateEventSchema, req.body, res);
    if (!params || !body) return;
    const { eventId } = params;
    const patch = normalizeEventBody(body);
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
    const params = parseParams(eventParamsSchema, req.params, res);
    const body = parseBody(eventStatusSchema, req.body, res);
    if (!params || !body) return;
    const { eventId } = params;
    const { status } = body;
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
    const params = parseParams(eventParamsSchema, req.params, res);
    const body = parseBody(eventLiveSchema, req.body, res);
    if (!params || !body) return;
    const { eventId } = params;
    const { isLive } = body;
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
      const params = parseParams(eventParamsSchema, req.params, res);
      if (!params) return;
      const { eventId } = params;
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
