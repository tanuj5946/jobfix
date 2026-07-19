import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL:   z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_SECRET:     z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_EXPIRES: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES: z.string().default('7d'),
  PORT:           z.coerce.number().default(3001),
  AI_SERVICE_URL: z.string().url('AI_SERVICE_URL must be a valid URL').default('http://localhost:8000'),
  INTERNAL_API_KEY: z.string().min(16, 'INTERNAL_API_KEY must be at least 16 characters'),
  CORS_ORIGINS:   z.string().default('http://localhost:5173'),
  FRONTEND_URL:   z.string().url('FRONTEND_URL must be a valid URL').default('http://localhost:5173'),
  AWS_REGION:     z.string().trim().optional(),
  AWS_ACCESS_KEY_ID: z.string().trim().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
  SES_FROM_EMAIL: z.string().trim().optional(),
  NODE_ENV:       z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
