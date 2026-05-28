import { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), 'must be a valid MongoDB ObjectId');

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown, res: Response): T | null {
  return parsePayload(schema, body, res, 'Invalid request body');
}

export function parseParams<T>(schema: z.ZodSchema<T>, params: unknown, res: Response): T | null {
  return parsePayload(schema, params, res, 'Invalid request parameters');
}

function parsePayload<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  res: Response,
  fallback: string
): T | null {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;

  const firstIssue = result.error.issues[0];
  const path = firstIssue?.path.length ? `${firstIssue.path.join('.')}: ` : '';
  res.status(400).json({ error: `${fallback}: ${path}${firstIssue?.message ?? 'validation failed'}` });
  return null;
}
