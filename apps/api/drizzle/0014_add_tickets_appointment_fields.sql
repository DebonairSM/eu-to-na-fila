-- Walk-in / appointment hybrid: extend tickets for type, scheduled_time, check_in_time, ticket_number
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "type" text NOT NULL DEFAULT 'walkin';
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "scheduled_time" timestamp with time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "check_in_time" timestamp with time zone;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticket_number" text;
