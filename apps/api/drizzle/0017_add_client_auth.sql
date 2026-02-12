-- Customer auth: password and Google OAuth on clients
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_hash" text;
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "google_id" text;
--> statement-breakpoint
-- Unique email per shop for login (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS "clients_shop_email_unique" ON "clients" ("shop_id", LOWER("email")) WHERE "email" IS NOT NULL;
