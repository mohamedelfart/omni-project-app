import { z } from 'zod';

export * from './markets';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const apiEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string(),
  JWT_REFRESH_TTL: z.string(),
  OTP_PROVIDER: z.string().default('mock'),
  OTP_TTL_SECONDS: z.coerce.number().default(300),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().default(30),
  ACCOUNT_VERIFICATION_TTL_HOURS: z.coerce.number().default(24),
  API_PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('api/v1'),
  APP_BASE_URL: z.string().url(),
  WS_PORT: z.coerce.number().default(4001),
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  GOOGLE_MAPS_REGION: z.string().default('QA'),
  STORAGE_PROVIDER: z.string().default('s3'),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_REGION: z.string().min(1),
  PAYMENT_PROVIDER: z.string().default('stripe'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(8),
});

const webEnvSchema = baseEnvSchema.extend({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
});

const mobileEnvSchema = baseEnvSchema.extend({
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1),
  EXPO_PUBLIC_WS_URL: z.string().url(),
});

export const parseApiEnv = (env: Record<string, string | undefined>) => apiEnvSchema.parse(env);

export const parseWebEnv = (env: Record<string, string | undefined>) => webEnvSchema.parse(env);

export const parseMobileEnv = (env: Record<string, string | undefined>) =>
  mobileEnvSchema.parse(env);
