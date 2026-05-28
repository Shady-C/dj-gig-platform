import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../config/env';
import Tip from '../models/Tip';
import Event from '../models/Event';
import { requireAdmin } from '../middleware/auth';
import { hashIdentifier } from '../utils/hash';
import { objectIdSchema, parseBody, parseParams } from '../utils/validation';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const tipRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tip requests, please try again later' },
});

type GigParams = { slug: string };
type AdminParams = { eventId: string };

const gigParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

const adminParamsSchema = z.object({
  eventId: objectIdSchema,
});

const tipIntentSchema = z.object({
  amount: z.number().int().min(env.MIN_TIP_AMOUNT).max(env.MAX_TIP_AMOUNT),
  currency: z.string().length(3).optional(),
  tipperName: z.string().max(120).optional(),
  message: z.string().max(500).optional(),
  idempotencyKey: z.string().max(200).optional(),
}).strict();

function eventScope(req: Request) {
  if (req.user?.role === 'admin') return {};
  return { ownerId: req.user?.sub };
}

function getSessionId(req: Request): string {
  const header = req.headers['x-session-id'];
  return typeof header === 'string' && header.trim() ? header.trim() : 'anonymous';
}

export function createTipsRouter(): Router {
  const router = Router();

  router.post('/gigs/:slug/tips/intent', tipRateLimit, async (req: Request<GigParams>, res: Response) => {
    const params = parseParams(gigParamsSchema, req.params, res);
    const body = parseBody(tipIntentSchema, req.body, res);
    if (!params || !body) return;
    const { amount, currency, tipperName, message, idempotencyKey } = body;

    if (currency && currency.toLowerCase() !== env.TIP_CURRENCY) {
      res.status(400).json({ error: `currency must be ${env.TIP_CURRENCY}` });
      return;
    }

    const event = await Event.findOne({ slug: params.slug });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    if (event.status !== 'live') {
      res.status(409).json({ error: 'Tips are only available while the event is live' });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: env.TIP_CURRENCY,
        automatic_payment_methods: { enabled: true },
        metadata: {
          eventId: event._id.toString(),
          source: 'dj_tip',
        },
      },
      {
        idempotencyKey: hashIdentifier(`${event._id}:${getSessionId(req)}:${idempotencyKey ?? amount}`),
      }
    );

    await Tip.create({
      eventId: event._id,
      amount,
      currency: env.TIP_CURRENCY,
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      tipperName: tipperName ?? '',
      message: message ?? '',
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  });

  router.get('/admin/events/:eventId/tips', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const params = parseParams(adminParamsSchema, req.params, res);
    if (!params) return;
    const event = await Event.findOne({ _id: params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const tips = await Tip.find({ eventId: params.eventId }).sort({ createdAt: -1 });
    res.json(tips);
  });

  router.get('/admin/events/:eventId/tips/summary', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const params = parseParams(adminParamsSchema, req.params, res);
    if (!params) return;
    const event = await Event.findOne({ _id: params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const result = await Tip.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(params.eventId),
          status: 'succeeded',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' },
        },
      },
    ]);
    const summary = result[0] ?? { total: 0, count: 0, average: 0 };
    res.json(summary);
  });

  return router;
}
