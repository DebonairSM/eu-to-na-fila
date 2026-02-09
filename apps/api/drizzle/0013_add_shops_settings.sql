ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "settings" jsonb;
COMMENT ON COLUMN "shops"."settings" IS 'Per-shop business rules and queue config (merged with defaults on read)';
