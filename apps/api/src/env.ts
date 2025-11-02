import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATA_PATH: z.string().default('./data/eutonafila.sqlite'),
  JWT_SECRET: z.string().min(32).default('change_me_in_production_use_a_long_random_string_at_least_32_chars'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SHOP_SLUG: z.string().default('mineiro'),
});

export const env = envSchema.parse(process.env);

