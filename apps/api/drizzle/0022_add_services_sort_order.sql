-- Display order for services within a shop (lower = first).
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
