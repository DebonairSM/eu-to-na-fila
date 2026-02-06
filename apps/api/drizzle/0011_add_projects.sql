-- Create projects table
CREATE TABLE IF NOT EXISTS "projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "path" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Unique slug per project
CREATE UNIQUE INDEX IF NOT EXISTS "projects_slug_unique" ON "projects" USING btree ("slug");

-- Add project_id to shops (nullable for backfill)
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "project_id" integer;

-- Backfill: create mineiro project and assign existing shop(s)
INSERT INTO "projects" ("slug", "name", "path", "created_at", "updated_at")
VALUES ('mineiro', 'Mineiro', '/projects/mineiro', now(), now())
ON CONFLICT ("slug") DO NOTHING;

UPDATE "shops" SET "project_id" = (SELECT "id" FROM "projects" WHERE "slug" = 'mineiro' LIMIT 1)
WHERE "slug" = 'mineiro' AND "project_id" IS NULL;

-- Ensure any other shops get a project (use mineiro as default for existing data)
UPDATE "shops" SET "project_id" = (SELECT "id" FROM "projects" WHERE "slug" = 'mineiro' LIMIT 1)
WHERE "project_id" IS NULL;

-- Now enforce NOT NULL and FK
ALTER TABLE "shops" ALTER COLUMN "project_id" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "shops" ADD CONSTRAINT "shops_project_id_projects_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop global unique on slug and add per-project unique
ALTER TABLE "shops" DROP CONSTRAINT IF EXISTS "shops_slug_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "shops_project_id_slug_unique" ON "shops" USING btree ("project_id", "slug");

-- Index for project_id lookups
CREATE INDEX IF NOT EXISTS "shops_project_id_idx" ON "shops" USING btree ("project_id");
