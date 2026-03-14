-- Client accounts are scoped to company (above shops): one identity per company, usable at any shop.
-- Add company_id, backfill from shop, drop shop-scoped uniques, add company-scoped uniques, make shop_id nullable.

ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "company_id" integer REFERENCES "companies"("id");
--> statement-breakpoint
UPDATE "clients" SET "company_id" = (SELECT "company_id" FROM "shops" WHERE "shops"."id" = "clients"."shop_id") WHERE "company_id" IS NULL AND "shop_id" IS NOT NULL;
--> statement-breakpoint
DELETE FROM "clients" WHERE "company_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS "clients_shop_phone_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "clients_shop_email_unique";
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "shop_id" DROP NOT NULL;
