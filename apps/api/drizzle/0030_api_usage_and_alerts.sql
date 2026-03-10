-- API usage buckets: aggregated request counts per shop per hour
CREATE TABLE IF NOT EXISTS "api_usage_buckets" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer REFERENCES "shops"("id"),
  "company_id" integer REFERENCES "companies"("id"),
  "bucket_start" timestamp with time zone NOT NULL,
  "endpoint_tag" text NOT NULL,
  "method" text NOT NULL,
  "request_count" integer NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_buckets_shop_bucket_idx" ON "api_usage_buckets" ("shop_id", "bucket_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_buckets_company_bucket_idx" ON "api_usage_buckets" ("company_id", "bucket_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_usage_buckets_bucket_start_idx" ON "api_usage_buckets" ("bucket_start");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_usage_buckets_upsert_idx" ON "api_usage_buckets" ((COALESCE("shop_id", -1)), (COALESCE("company_id", -1)), "bucket_start", "endpoint_tag", "method");

--> statement-breakpoint
-- Usage alerts: spike detection per shop
CREATE TABLE IF NOT EXISTS "usage_alerts" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer NOT NULL REFERENCES "shops"("id"),
  "company_id" integer NOT NULL REFERENCES "companies"("id"),
  "triggered_at" timestamp with time zone NOT NULL DEFAULT now(),
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "request_count" integer NOT NULL,
  "baseline_count" integer NOT NULL,
  "reason" text NOT NULL,
  "resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_alerts_company_id_idx" ON "usage_alerts" ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "usage_alerts_shop_id_idx" ON "usage_alerts" ("shop_id");
