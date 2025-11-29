import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4041'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/eutonafila'),
  JWT_SECRET: z.string().min(32).default('change_me_in_production_use_a_long_random_string_at_least_32_chars'),
  CORS_ORIGIN: z.string().default('http://localhost:4040'),
  SHOP_SLUG: z.string().default('mineiro'),
});

export const env = envSchema.parse(process.env);
