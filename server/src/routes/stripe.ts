import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import Tip from '../models/Tip';
import { Server } from 'socket.io';
import { emitToEvent } from '../socket/handlers';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export function createStripeRouter(io: Server): Router {
  const router = Router();

  // Raw body is required for Stripe signature verification.
  // This route must be mounted before express.json() in index.ts.
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      res.status(400).json({ error: 'Webhook signature verification failed' });
      return;
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const latestCharge =
        typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id;
      const tip = await Tip.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: 'succeeded',
          stripeChargeId: latestCharge ?? '',
          paymentMethodType: paymentIntent.payment_method_types[0] ?? '',
        },
        { new: true }
      );
      if (tip) {
        emitToEvent(io, tip.eventId.toString(), 'tip:received', {
          amount: tip.amount,
          currency: tip.currency,
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await Tip.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: 'failed' }
      );
    }

    res.json({ received: true });
  });

  return router;
}
