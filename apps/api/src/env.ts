import { z } from 'zod';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from src/env.ts: src -> api -> root)
// In production (Render), environment variables are set via dashboard, not .env file
const envPath = resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4041'),
  DATABASE_URL: z
    .string()
    .default(
      `postgresql://${process.env.USER || process.env.USERNAME || 'postgres'}@localhost:5432/eutonafila`
    ),
  /** Max connections in the DB pool. Keep low (e.g. 3–5) for Supabase Session mode to avoid MaxClientsInSessionMode. */
  DATABASE_POOL_MAX: z
    .string()
    .optional()
    .transform((s) => (s != null && s !== '' ? Number(s) : undefined)),
  JWT_SECRET: z.string().min(32).default('change_me_in_production_use_a_long_random_string_at_least_32_chars'),
  CORS_ORIGIN: z.string().default('http://localhost:4040'),
  SHOP_SLUG: z.string().default('shop'),
  /** Project slug for resolving shops. Optional; when unset, SHOP_SLUG is used as fallback (e.g. auth redirects). */
  PROJECT_SLUG: z.string().optional(),
  // Supabase Storage configuration for ad files
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Storage configuration (S3-compatible) - Optional, only needed if using cloud storage
  // If not provided, files will be stored locally in public/companies/ directory
  STORAGE_PROVIDER: z.enum(['s3', 'r2', 'minio']).optional(),
  STORAGE_ENDPOINT: z.string().optional(), // Required for R2/MinIO, optional for S3
  STORAGE_REGION: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(), // Public base URL for accessing files (CDN or storage public URL)
  /** Uploaded ad image max width in pixels before resize. */
  AD_IMAGE_MAX_WIDTH: z.string().transform(Number).default('1920'),
  /** Uploaded ad image max height in pixels before resize. */
  AD_IMAGE_MAX_HEIGHT: z.string().transform(Number).default('1080'),
  /** Uploaded ad image WebP quality (1-100). */
  AD_IMAGE_WEBP_QUALITY: z.string().transform(Number).default('82'),
  /** Max uploaded ad image size in MB before optimization. */
  AD_IMAGE_MAX_UPLOAD_MB: z.string().transform(Number).default('10'),
  /** Max uploaded ad video size in MB. */
  AD_VIDEO_MAX_UPLOAD_MB: z.string().transform(Number).default('20'),
  /** Warning threshold for uploaded ad video size in MB. */
  AD_VIDEO_WARN_UPLOAD_MB: z.string().transform(Number).default('12'),
  /** Enable server-side ad video normalization (mp4/h264 profile for kiosk delivery). */
  AD_VIDEO_NORMALIZE_ENABLED: z
    .string()
    .optional()
    .transform((value) => {
      if (value == null || value === '') return true;
      return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
    }),
  /** Normalized ad video max width in pixels. */
  AD_VIDEO_MAX_WIDTH: z.string().transform(Number).default('1280'),
  /** Target video bitrate in kbps for normalized ad videos. */
  AD_VIDEO_TARGET_BITRATE_KBPS: z.string().transform(Number).default('1800'),
  /** Max video bitrate in kbps for normalized ad videos. */
  AD_VIDEO_MAXRATE_KBPS: z.string().transform(Number).default('2400'),
  /** Audio bitrate in kbps for normalized ad videos. */
  AD_VIDEO_AUDIO_BITRATE_KBPS: z.string().transform(Number).default('128'),
  /** Google Places API key for address lookup. If set, Google Places is used; otherwise Nominatim (OpenStreetMap) is used for free. */
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  /** Nominatim base URL (e.g. self-hosted). Defaults to https://nominatim.openstreetmap.org. Only used when GOOGLE_PLACES_API_KEY is not set. */
  NOMINATIM_BASE_URL: z.string().url().optional(),
  /** User-Agent for Nominatim requests (required by usage policy). Defaults to app identifier. */
  NOMINATIM_USER_AGENT: z.string().optional(),
  /** Google OAuth 2.0 for customer Sign in with Google. Optional; if not set, Google login is disabled. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Canonical public URL of the API (no trailing slash). When set, used to build Google OAuth redirect_uri so it matches Google Cloud Console. */
  PUBLIC_API_URL: z.string().url().optional(),
  /** Company ID for the root marketing site (Propagandas / buy-ad flow). When set, GET /api/public/propagandas/shops returns this company's shops. */
  ROOT_COMPANY_ID: z
    .string()
    .optional()
    .transform((s) => (s != null && s !== '' ? Number(s) : undefined)),
  /** Stripe secret key for Propagandas payments. When set, checkout and webhook are enabled. */
  STRIPE_SECRET_KEY: z.string().optional(),
  /** Stripe webhook signing secret for verifying checkout.session.completed. */
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  /** Public URL of the frontend (root site) for Stripe success/cancel redirects. No trailing slash. */
  FRONTEND_PUBLIC_URL: z.string().url().optional(),
  /** Enable websocket queue.updated broadcasts. Keep true unless diagnosing websocket issues. */
  QUEUE_WS_ENABLED: z
    .string()
    .optional()
    .transform((value) => {
      if (value == null || value === '') return true;
      return !['0', 'false', 'off', 'no'].includes(value.toLowerCase());
    }),
});

let env: z.infer<typeof envSchema>;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const missingVars = error.errors
      .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
      .map((e) => e.path.join('.'));
    
    const invalidVars = error.errors
      .filter((e) => e.code !== 'invalid_type' || e.received !== 'undefined')
      .map((e) => `${e.path.join('.')}: ${e.message}`);
    
    const errorMessage = [
      'Environment variable validation failed:',
      missingVars.length > 0 && `Missing required variables: ${missingVars.join(', ')}`,
      invalidVars.length > 0 && `Invalid variables: ${invalidVars.join('; ')}`,
    ]
      .filter(Boolean)
      .join('\n');
    
    console.error(errorMessage);
    console.error('Full Zod error:', JSON.stringify(error.errors, null, 2));
    throw new Error(errorMessage);
  }
  throw error;
}

export { env };
