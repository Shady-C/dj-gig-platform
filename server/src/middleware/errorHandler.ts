import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface HttpError extends Error {
  status?: number;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message = isProd && status >= 500 ? 'Internal server error' : err.message || 'Internal server error';
  logger.error(err);
  res.status(status).json({ error: message });
}
