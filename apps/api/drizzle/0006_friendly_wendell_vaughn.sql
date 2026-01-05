-- Create companies table
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Create company_admins table
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
--> statement-breakpoint
-- Add company_id to shops table (nullable for migration)
DO $$ BEGIN
 ALTER TABLE "shops" ADD COLUMN "company_id" integer;
EXCEPTION
 WHEN duplicate_column THEN null;
END $$;
--> statement-breakpoint
-- Create indexes
CREATE INDEX IF NOT EXISTS "company_admins_company_id_idx" ON "company_admins" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_admins_username_idx" ON "company_admins" ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shops_company_id_idx" ON "shops" ("company_id");--> statement-breakpoint
-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "shops" ADD CONSTRAINT "shops_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_admins" ADD CONSTRAINT "company_admins_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
