-- Clip notes per service: one section per service in the UI
ALTER TABLE "client_clip_notes" ADD COLUMN IF NOT EXISTS "service_id" integer REFERENCES "services"("id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "client_clip_notes_service_id_idx" ON "client_clip_notes" ("service_id");
