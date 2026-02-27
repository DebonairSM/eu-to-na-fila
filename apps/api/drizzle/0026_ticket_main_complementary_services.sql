-- Support main + complementary service selection per ticket.
-- service_id remains the "primary" for backward compat (main if set, else first complementary).
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "main_service_id" integer REFERENCES "services"("id");
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "complementary_service_ids" integer[] NOT NULL DEFAULT '{}';
