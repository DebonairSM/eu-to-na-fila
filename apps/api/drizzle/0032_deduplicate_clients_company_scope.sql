-- Deduplicate clients by (company_id, phone) so unique indexes can be created.
-- Keep one row per group (prefer with password_hash for login, then lowest id); reassign tickets and clip notes, then delete duplicates.

WITH ranked AS (
  SELECT id, company_id, phone,
    row_number() OVER (PARTITION BY company_id, phone ORDER BY (password_hash IS NOT NULL) DESC, id ASC) AS rn
  FROM clients
),
loser_winner AS (
  SELECT r.id AS loser_id, w.id AS winner_id
  FROM ranked r
  JOIN ranked w ON w.company_id = r.company_id AND w.phone = r.phone AND w.rn = 1
  WHERE r.rn > 1
)
UPDATE tickets t SET client_id = l.winner_id
FROM loser_winner l WHERE t.client_id = l.loser_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, company_id, phone,
    row_number() OVER (PARTITION BY company_id, phone ORDER BY (password_hash IS NOT NULL) DESC, id ASC) AS rn
  FROM clients
),
loser_winner AS (
  SELECT r.id AS loser_id, w.id AS winner_id
  FROM ranked r
  JOIN ranked w ON w.company_id = r.company_id AND w.phone = r.phone AND w.rn = 1
  WHERE r.rn > 1
)
UPDATE client_clip_notes c SET client_id = l.winner_id
FROM loser_winner l WHERE c.client_id = l.loser_id;
--> statement-breakpoint
WITH ranked AS (
  SELECT id,
    row_number() OVER (PARTITION BY company_id, phone ORDER BY (password_hash IS NOT NULL) DESC, id ASC) AS rn
  FROM clients
)
DELETE FROM clients WHERE id IN (SELECT id FROM ranked WHERE rn > 1);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_phone_unique" ON "clients" ("company_id", "phone");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_company_email_unique" ON "clients" ("company_id", LOWER("email")) WHERE "email" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clients_company_id_idx" ON "clients" ("company_id");
