import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { env } from './config/env';
import { connectDB } from './config/db';
import { buildApp } from './app';
import { logger } from './utils/logger';
import { registerSocketHandlers } from './socket/handlers';

const server = http.createServer();

const io = new Server(server, {
  cors: { origin: [env.CLIENT_ORIGIN, env.ADMIN_ORIGIN], credentials: true },
});
registerSocketHandlers(io);

const app = buildApp(io);
server.on('request', app);

connectDB()
  .then(() => {
    server.listen(Number(env.PORT), () => {
      logger.info(`Server running on :${env.PORT}`);
    });
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to connect to MongoDB');
    process.exit(1);
  });

function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down`);
  server.close(() => {
    mongoose.connection.close(false).then(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    }).catch(() => process.exit(1));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
