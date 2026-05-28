import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import authRouter from './routes/auth';
import { createEventsRouter } from './routes/events';
import { createRequestsRouter } from './routes/requests';
import { createTipsRouter } from './routes/tips';
import { createStripeRouter } from './routes/stripe';

export function buildApp(io: Server) {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  const corsOptions = {
    origin: [env.CLIENT_ORIGIN, env.ADMIN_ORIGIN],
    credentials: true,
  };

  const sanitizeMongoPayloads: RequestHandler = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') mongoSanitize.sanitize(req.body);
    if (req.params && typeof req.params === 'object') mongoSanitize.sanitize(req.params);
    if (req.query && typeof req.query === 'object') {
      mongoSanitize.sanitize(req.query as Record<string, unknown>);
    }
    next();
  };

  // Stripe webhook must receive raw body — mount before express.json()
  app.use('/api/stripe', createStripeRouter(io));

  app.use(cors(corsOptions));
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitizeMongoPayloads);
  app.use(hpp());

  app.use('/api/auth', authRouter);
  app.use('/api', createEventsRouter(io));
  app.use('/api', createRequestsRouter(io));
  app.use('/api', createTipsRouter());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.use(errorHandler);

  return app;
}
