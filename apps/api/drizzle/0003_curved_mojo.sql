ALTER TABLE "shops" ADD COLUMN "owner_pin_hash" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "staff_pin_hash" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "owner_pin_reset_required" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "staff_pin_reset_required" boolean DEFAULT true NOT NULL;