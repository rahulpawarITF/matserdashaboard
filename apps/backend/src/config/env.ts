import path from 'path';
import { z } from 'zod';
import dotenv from 'dotenv';
import fs from 'fs';

// ─── Smart .env loader ────────────────────────────────────────────────────────
// Priority 1: apps/backend/.env  (local dev — uses localhost URIs)
// Priority 2: repo root .env     (Docker Compose — uses service-name URIs)
// This means `npm run dev` from apps/backend/ works AND Docker works.
const localEnv = path.resolve(__dirname, '../../.env');   // apps/backend/.env  (dist/../../ = apps/backend/)
const rootEnv  = path.resolve(__dirname, '../../../.env'); // repo root .env

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config(); // fallback: process.cwd()/.env
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const envSchema = z.object({
  // App
  PORT:       z.string().default('3001'),
  NODE_ENV:   z.enum(['development', 'production', 'test']).default('development'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),

  // Database
  MONGODB_URI: z.string().min(10),

  // Redis
  REDIS_URL: z.string().min(10),

  // JWT
  JWT_ACCESS_SECRET:      z.string().min(32),
  JWT_REFRESH_SECRET:     z.string().min(32),

  // Encryption — must be exactly 64 hex chars (= 32 bytes)
  MASTER_ENCRYPTION_KEY: z.string().length(64, 'Must be exactly 32 bytes hex-encoded (64 chars)'),

  // Feature / tuning
  ENABLE_SWAGGER:                 z.string().default('true'),
  DATA_RETENTION_DAYS:            z.string().default('90'),
  DEFAULT_CHECK_INTERVAL_MINUTES: z.string().default('5'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    '❌ Invalid or missing environment variables:\n',
    JSON.stringify(parsed.error.format(), null, 2)
  );
  console.error('\n💡 Fix: make sure apps/backend/.env exists and contains all required values.');
  console.error('   Tip: copy apps/backend/.env from the repo root .env.example and fill in secrets.\n');
  process.exit(1);
}

// ─── Parsed + coerced env object ─────────────────────────────────────────────
export const env = {
  ...parsed.data,
  PORT:                           parseInt(parsed.data.PORT, 10),
  DATA_RETENTION_DAYS:            parseInt(parsed.data.DATA_RETENTION_DAYS, 10),
  DEFAULT_CHECK_INTERVAL_MINUTES: parseInt(parsed.data.DEFAULT_CHECK_INTERVAL_MINUTES, 10),
  ENABLE_SWAGGER:                 parsed.data.ENABLE_SWAGGER === 'true',
};

export type Env = typeof env;
