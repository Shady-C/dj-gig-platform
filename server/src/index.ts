import http from 'http';
import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { Server } from 'socket.io';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { registerSocketHandlers } from './socket/handlers';
import authRouter from './routes/auth';
import { createEventsRouter } from './routes/events';
import { createRequestsRouter } from './routes/requests';
import { createTipsRouter } from './routes/tips';
import { createStripeRouter } from './routes/stripe';

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: [env.CLIENT_ORIGIN, env.ADMIN_ORIGIN],
  credentials: true,
};

const io = new Server(server, { cors: corsOptions });
registerSocketHandlers(io);

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
app.use(helmet());
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeMongoPayloads);
app.use(hpp());

app.use('/api/auth', authRouter);
app.use('/api', createEventsRouter(io));
app.use('/api', createRequestsRouter(io));
app.use('/api', createTipsRouter());

app.use(errorHandler);

connectDB()
  .then(() => {
    server.listen(Number(env.PORT), () => {
      console.log(`Server running on :${env.PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });
