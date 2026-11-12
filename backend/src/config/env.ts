import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load .env for local development. In Docker the variables come from compose.
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4110),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  WEB_ORIGINS: z.string().default('http://localhost:3000'),
  MINIGAME_BASE_URL: z.string().url().default('https://minigame.joura.info'),
  MINIGAME_API_KEY: z.string().min(1),
  MINIGAME_GAME_ID: z.string().min(1),
  MINIGAME_WEBHOOK_SECRET: z.string().default(''),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Print variable names only, never values.
  console.error('Invalid environment:', parsed.error.issues.map((i) => i.path.join('.')).join(', '));
  process.exit(1);
}

export const env = {
  ...parsed.data,
  webOrigins: parsed.data.WEB_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  isProd: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
};
