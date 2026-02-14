-- Optional reminder email for Propagandas notifications
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "propagandas_reminder_email" text;

-- Per-duration pricing for Propagandas (BRL in cents)
CREATE TABLE IF NOT EXISTS "ad_pricing" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL REFERENCES "companies"("id"),
  "duration_seconds" integer NOT NULL,
  "amount_cents" integer NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ad_pricing_company_duration_unique" ON "ad_pricing" ("company_id", "duration_seconds");
CREATE INDEX IF NOT EXISTS "ad_pricing_company_id_idx" ON "ad_pricing" ("company_id");

-- Ad order payment and Stripe fields
ALTER TABLE "ad_orders" ADD COLUMN IF NOT EXISTS "amount_cents" integer;
ALTER TABLE "ad_orders" ADD COLUMN IF NOT EXISTS "stripe_session_id" text;
