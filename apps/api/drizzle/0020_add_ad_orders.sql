-- Ad orders from advertisers (Propagandas buy-ad flow). Admin approves then creates company_ad from order image.
CREATE TABLE IF NOT EXISTS "ad_orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "company_id" integer NOT NULL REFERENCES "companies"("id"),
  "advertiser_name" text NOT NULL,
  "advertiser_email" text NOT NULL,
  "advertiser_phone" text,
  "duration_seconds" integer NOT NULL,
  "shop_ids" jsonb NOT NULL DEFAULT '[]',
  "image_storage_key" text,
  "image_public_url" text,
  "image_mime_type" text,
  "image_bytes" integer,
  "status" text NOT NULL DEFAULT 'pending_approval',
  "payment_status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "approved_at" timestamp,
  "approved_by" integer REFERENCES "company_admins"("id")
);

CREATE INDEX IF NOT EXISTS "ad_orders_company_id_idx" ON "ad_orders" ("company_id");
CREATE INDEX IF NOT EXISTS "ad_orders_status_idx" ON "ad_orders" ("status");
