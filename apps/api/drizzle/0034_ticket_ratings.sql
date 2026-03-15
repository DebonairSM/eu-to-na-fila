-- One-tap rating (1-5) for completed tickets. One rating per ticket.
CREATE TABLE IF NOT EXISTS "ticket_ratings" (
  "id" serial PRIMARY KEY NOT NULL,
  "ticket_id" integer NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "barber_id" integer REFERENCES "barbers"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_ratings_ticket_id_unique" ON "ticket_ratings" ("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_ratings_ticket_id_idx" ON "ticket_ratings" ("ticket_id");
CREATE INDEX IF NOT EXISTS "ticket_ratings_barber_id_idx" ON "ticket_ratings" ("barber_id");
