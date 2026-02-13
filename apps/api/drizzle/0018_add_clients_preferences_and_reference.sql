ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "preferences" jsonb DEFAULT '{}';
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "next_service_note" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "next_service_image_url" text;
