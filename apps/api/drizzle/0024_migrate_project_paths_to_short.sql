-- Migrate project and shop paths from /projects/:slug to /:slug (e.g. /projects/mineiro -> /mineiro)
UPDATE "projects"
SET "path" = '/' || "slug"
WHERE "path" LIKE '/projects/%';

UPDATE "shops" s
SET "path" = p."path"
FROM "projects" p
WHERE s."project_id" = p."id"
  AND (s."path" IS NULL OR s."path" LIKE '/projects/%');
