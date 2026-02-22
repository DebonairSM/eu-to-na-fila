-- Display order for services within a shop (lower = first).
-- Required on production: run this migration if you see "column sort_order does not exist" on services or tickets_service.
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0;
