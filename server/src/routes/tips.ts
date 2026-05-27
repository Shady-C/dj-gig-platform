import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { env } from '../config/env';
import Tip from '../models/Tip';
import Event from '../models/Event';
import { requireAdmin } from '../middleware/auth';
import { hashIdentifier } from '../utils/hash';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

type GigParams = { slug: string };
type AdminParams = { eventId: string };

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

  router.post('/gigs/:slug/tips/intent', async (req: Request<GigParams>, res: Response) => {
    const { amount, currency, tipperName, message, idempotencyKey } = req.body as {
      amount?: number;
      currency?: string;
      tipperName?: string;
      message?: string;
      idempotencyKey?: string;
    };

    if (
      !amount ||
      typeof amount !== 'number' ||
      amount < env.MIN_TIP_AMOUNT ||
      amount > env.MAX_TIP_AMOUNT
    ) {
      res.status(400).json({
        error: `amount must be between ${env.MIN_TIP_AMOUNT} and ${env.MAX_TIP_AMOUNT} cents`,
      });
      return;
    }

    if (currency && currency.toLowerCase() !== env.TIP_CURRENCY) {
      res.status(400).json({ error: `currency must be ${env.TIP_CURRENCY}` });
      return;
    }

    const event = await Event.findOne({ slug: req.params.slug });
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
    const event = await Event.findOne({ _id: req.params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const tips = await Tip.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
    res.json(tips);
  });

  router.get('/admin/events/:eventId/tips/summary', requireAdmin, async (req: Request<AdminParams>, res: Response) => {
    const event = await Event.findOne({ _id: req.params.eventId, ...eventScope(req) });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const result = await Tip.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(req.params.eventId),
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
