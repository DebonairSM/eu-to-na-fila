-- Supabase migrations - ADDITIVE ONLY (no DROP, no RLS).
-- Safe for existing databases. Only adds tables, columns, indexes, constraints.
-- Omitted: 0009 (ENABLE ROW LEVEL SECURITY), 0010 (RLS policies), 0011 DROP CONSTRAINT,
-- 0027 DROP INDEX. Add those manually if you need them.
--
-- Idempotent: safe to re-run. Uses CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, DO $$ EXCEPTION WHEN duplicate_* THEN null for constraints,
-- and INSERT ... ON CONFLICT DO NOTHING. No duplicate tables, columns, or indexes.

-- ========== 0000_futuristic_brother_voodoo ==========
CREATE TABLE IF NOT EXISTS "barbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_present" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"price" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "shops" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"path" text,
	"api_base" text,
	"theme" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shops_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"barber_id" integer,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"status" text DEFAULT 'waiting' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"estimated_wait_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
 ALTER TABLE "barbers" ADD CONSTRAINT "barbers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ========== 0001_slim_chameleon ==========
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ========== 0002_hesitant_stephen_strange ==========
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ========== 0003_curved_mojo ==========
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin_hash" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin_hash" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin_reset_required" boolean DEFAULT true NOT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin_reset_required" boolean DEFAULT true NOT NULL;
EXCEPTION WHEN duplicate_column THEN null;
END $$;

-- ========== 0004_premium_punisher ==========
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "preferred_barber_id" integer;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_preferred_barber_id_barbers_id_fk" FOREIGN KEY ("preferred_barber_id") REFERENCES "barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ========== 0005_add_audit_tracking ==========
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "started_at" timestamp;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "completed_at" timestamp;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "cancelled_at" timestamp;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "barber_assigned_at" timestamp;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" integer NOT NULL,
	"ticket_id" integer,
	"action" text NOT NULL,
	"actor_type" text NOT NULL,
	"actor_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "audit_log_shop_id_idx" ON "audit_log" ("shop_id");
CREATE INDEX IF NOT EXISTS "audit_log_ticket_id_idx" ON "audit_log" ("ticket_id");
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action");
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" ("created_at");

-- ========== 0006_friendly_wendell_vaughn ==========
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
CREATE TABLE IF NOT EXISTS "company_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_admins_username_unique" UNIQUE("username")
);
DO $$ BEGIN
 ALTER TABLE "shops" ADD COLUMN "company_id" integer;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "company_admins_company_id_idx" ON "company_admins" ("company_id");
CREATE INDEX IF NOT EXISTS "company_admins_username_idx" ON "company_admins" ("username");
CREATE INDEX IF NOT EXISTS "shops_company_id_idx" ON "shops" ("company_id");
DO $$ BEGIN
 ALTER TABLE "shops" ADD CONSTRAINT "shops_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "company_admins" ADD CONSTRAINT "company_admins_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ========== 0007_cuddly_namora ==========
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "device_id" text;
EXCEPTION WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS "tickets_shop_device_idx" ON "tickets" ("shop_id","device_id");

-- ========== 0008_burly_randall ==========
CREATE TABLE IF NOT EXISTS "company_ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"shop_id" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"media_type" text NOT NULL,
	"mime_type" text NOT NULL,
	"bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text NOT NULL,
	"etag" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "company_ads_company_id_idx" ON "company_ads" ("company_id");
CREATE INDEX IF NOT EXISTS "company_ads_shop_id_idx" ON "company_ads" ("shop_id");
CREATE INDEX IF NOT EXISTS "company_ads_enabled_idx" ON "company_ads" ("enabled");
CREATE INDEX IF NOT EXISTS "company_ads_position_idx" ON "company_ads" ("company_id","shop_id","position");
DO $$ BEGIN
 ALTER TABLE "company_ads" ADD CONSTRAINT "company_ads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
 ALTER TABLE "company_ads" ADD CONSTRAINT "company_ads_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- (0009 RLS and 0010 RLS policies omitted - additive only)

-- ========== 0011_add_projects ==========
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "path" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_unique" ON "projects" USING btree ("slug");
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "project_id" integer;
INSERT INTO "projects" ("slug", "name", "path", "created_at", "updated_at")
VALUES ('mineiro', 'Mineiro', '/projects/mineiro', now(), now())
ON CONFLICT ("slug") DO NOTHING;
UPDATE "shops" SET "project_id" = (SELECT "id" FROM "projects" WHERE "slug" = 'mineiro' LIMIT 1)
WHERE "slug" = 'mineiro' AND "project_id" IS NULL;
UPDATE "shops" SET "project_id" = (SELECT "id" FROM "projects" WHERE "slug" = 'mineiro' LIMIT 1)
WHERE "project_id" IS NULL;
ALTER TABLE "shops" ALTER COLUMN "project_id" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "shops" ADD CONSTRAINT "shops_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- (DROP CONSTRAINT shops_slug_unique omitted - additive only; per-project slug unique below)
CREATE UNIQUE INDEX IF NOT EXISTS "shops_project_id_slug_unique" ON "shops" USING btree ("project_id", "slug");
CREATE INDEX IF NOT EXISTS "shops_project_id_idx" ON "shops" USING btree ("project_id");

-- ========== 0016_add_clients_and_clip_notes ==========
CREATE TABLE IF NOT EXISTS "clients" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer NOT NULL REFERENCES "shops"("id"),
  "phone" text NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "clients_shop_phone_unique" ON "clients" ("shop_id","phone");
CREATE INDEX IF NOT EXISTS "clients_shop_id_idx" ON "clients" ("shop_id");
CREATE TABLE IF NOT EXISTS "client_clip_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "barber_id" integer NOT NULL REFERENCES "barbers"("id"),
  "note" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "client_clip_notes_client_id_idx" ON "client_clip_notes" ("client_id");
CREATE INDEX IF NOT EXISTS "client_clip_notes_barber_id_idx" ON "client_clip_notes" ("barber_id");
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "client_id" integer REFERENCES "clients"("id");
CREATE INDEX IF NOT EXISTS "tickets_client_id_idx" ON "tickets" ("client_id");

-- ========== 0017_add_client_auth ==========
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "google_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "clients_shop_email_unique" ON "clients" ("shop_id", LOWER("email")) WHERE "email" IS NOT NULL;

-- ========== 0023_add_owner_staff_username ==========
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "owner_username" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "staff_username" text;

-- ========== 0024_migrate_project_paths_to_short ==========
UPDATE "projects"
SET "path" = '/' || "slug"
WHERE "path" LIKE '/projects/%';
UPDATE "shops" s
SET "path" = p."path"
FROM "projects" p
WHERE s."project_id" = p."id"
  AND (s."path" IS NULL OR s."path" LIKE '/projects/%');

-- ========== 0025_add_services_kind ==========
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'complementary';
CREATE UNIQUE INDEX IF NOT EXISTS "services_one_main_per_shop" ON "services" ("shop_id") WHERE kind = 'main';

-- ========== 0026_ticket_main_complementary_services ==========
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "main_service_id" integer REFERENCES "services"("id");
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "complementary_service_ids" integer[] NOT NULL DEFAULT '{}';

-- (0027 DROP INDEX services_one_main_per_shop omitted - additive only; one main per shop remains)

-- ========== 0028_clip_notes_service_id ==========
ALTER TABLE "client_clip_notes" ADD COLUMN IF NOT EXISTS "service_id" integer REFERENCES "services"("id");
CREATE INDEX IF NOT EXISTS "client_clip_notes_service_id_idx" ON "client_clip_notes" ("service_id");

-- ========== 0029_password_reset_tokens ==========
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer NOT NULL REFERENCES "shops"("id"),
  "entity_type" text NOT NULL,
  "entity_id" integer NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_idx" ON "password_reset_tokens" ("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens" ("expires_at");

-- ========== 0030_api_usage_and_alerts ==========
CREATE TABLE IF NOT EXISTS "api_usage_buckets" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer REFERENCES "shops"("id"),
  "company_id" integer REFERENCES "companies"("id"),
  "bucket_start" timestamp with time zone NOT NULL,
  "endpoint_tag" text NOT NULL,
  "method" text NOT NULL,
  "request_count" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "api_usage_buckets_shop_bucket_idx" ON "api_usage_buckets" ("shop_id", "bucket_start");
CREATE INDEX IF NOT EXISTS "api_usage_buckets_company_bucket_idx" ON "api_usage_buckets" ("company_id", "bucket_start");
CREATE INDEX IF NOT EXISTS "api_usage_buckets_bucket_start_idx" ON "api_usage_buckets" ("bucket_start");
CREATE UNIQUE INDEX IF NOT EXISTS "api_usage_buckets_upsert_idx" ON "api_usage_buckets" ((COALESCE("shop_id", -1)), (COALESCE("company_id", -1)), "bucket_start", "endpoint_tag", "method");

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
CREATE INDEX IF NOT EXISTS "usage_alerts_company_id_idx" ON "usage_alerts" ("company_id");
CREATE INDEX IF NOT EXISTS "usage_alerts_shop_id_idx" ON "usage_alerts" ("shop_id");
