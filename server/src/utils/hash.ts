import crypto from 'crypto';
import { env } from '../config/env';

export function hashIdentifier(value: string): string {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(value).digest('hex');
}
