import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from src/env.ts: src -> api -> root)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4041'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/eutonafila'),
  JWT_SECRET: z.string().min(32).default('change_me_in_production_use_a_long_random_string_at_least_32_chars'),
  CORS_ORIGIN: z.string().default('http://localhost:4040'),
  SHOP_SLUG: z.string().default('mineiro'),
  // Storage configuration (S3-compatible)
  STORAGE_PROVIDER: z.enum(['s3', 'r2', 'minio']).default('s3'),
  STORAGE_ENDPOINT: z.string().optional(), // Required for R2/MinIO, optional for S3
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string(),
  STORAGE_ACCESS_KEY_ID: z.string(),
  STORAGE_SECRET_ACCESS_KEY: z.string(),
  STORAGE_PUBLIC_BASE_URL: z.string(), // Public base URL for accessing files (CDN or storage public URL)
});

export const env = envSchema.parse(process.env);
