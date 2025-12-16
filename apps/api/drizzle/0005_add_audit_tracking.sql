-- Add timestamp columns to tickets table (idempotent)
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "started_at" timestamp;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "completed_at" timestamp;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "cancelled_at" timestamp;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "barber_assigned_at" timestamp;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint

-- Create audit_log table
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
--> statement-breakpoint

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "audit_log_shop_id_idx" ON "audit_log" ("shop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_ticket_id_idx" ON "audit_log" ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_action_idx" ON "audit_log" ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log" ("created_at");

