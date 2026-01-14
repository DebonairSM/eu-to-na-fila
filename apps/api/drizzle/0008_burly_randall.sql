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
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_ads_company_id_idx" ON "company_ads" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_ads_shop_id_idx" ON "company_ads" ("shop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_ads_enabled_idx" ON "company_ads" ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_ads_position_idx" ON "company_ads" ("company_id","shop_id","position");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_ads" ADD CONSTRAINT "company_ads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_ads" ADD CONSTRAINT "company_ads_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
