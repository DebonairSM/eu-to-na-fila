DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin_hash" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin_hash" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin_reset_required" boolean DEFAULT true NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin_reset_required" boolean DEFAULT true NOT NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;