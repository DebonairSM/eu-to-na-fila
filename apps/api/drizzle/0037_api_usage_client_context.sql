ALTER TABLE "api_usage_buckets"
ADD COLUMN IF NOT EXISTS "client_context" text NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
DROP INDEX IF EXISTS "api_usage_buckets_upsert_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_usage_buckets_upsert_idx" ON "api_usage_buckets" ((COALESCE("shop_id", -1)), (COALESCE("company_id", -1)), "bucket_start", "endpoint_tag", "method", "client_context");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_buckets_company_context_idx" ON "api_usage_buckets" ("company_id", "bucket_start", "client_context");
