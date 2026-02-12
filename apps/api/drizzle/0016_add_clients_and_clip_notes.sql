-- Clients and clip notes: minimal client accounts for remember-my-info and barber notes
CREATE TABLE IF NOT EXISTS "clients" (
  "id" serial PRIMARY KEY NOT NULL,
  "shop_id" integer NOT NULL REFERENCES "shops"("id"),
  "phone" text NOT NULL,
  "name" text NOT NULL,
  "email" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_shop_phone_unique" ON "clients" ("shop_id","phone");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_shop_id_idx" ON "clients" ("shop_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_clip_notes" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "barber_id" integer NOT NULL REFERENCES "barbers"("id"),
  "note" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_clip_notes_client_id_idx" ON "client_clip_notes" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_clip_notes_barber_id_idx" ON "client_clip_notes" ("barber_id");
--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "client_id" integer REFERENCES "clients"("id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_client_id_idx" ON "tickets" ("client_id");
