import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const cloudinaryEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(1),
  MIN_TIP_AMOUNT: z.coerce.number().int().positive().default(50),
  MAX_TIP_AMOUNT: z.coerce.number().int().positive().default(50000),
  TIP_CURRENCY: z.string().length(3).default('cad'),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLIENT_ORIGIN: z.string().url(),
  ADMIN_ORIGIN: z.string().url(),
}).superRefine((value, ctx) => {
  for (const key of cloudinaryEnvVars) {
    const envValue = value[key].trim();
    if (!envValue || envValue.startsWith('REPLACE_WITH_')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} is required for hero image uploads`,
      });
    }
  }
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
