import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
}
