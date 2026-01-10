ALTER TABLE "tickets" ADD COLUMN "device_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_shop_device_idx" ON "tickets" ("shop_id","device_id");