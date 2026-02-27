-- Service type: main (at most one per shop) or complementary.
-- Customers can select one main and/or any number of complementaries when joining.
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'complementary';
-- Ensure only one main per shop (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS "services_one_main_per_shop" ON "services" ("shop_id") WHERE kind = 'main';
