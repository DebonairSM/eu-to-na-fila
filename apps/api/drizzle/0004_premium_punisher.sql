-- Add preferred_barber_id column (idempotent)
DO $$ BEGIN
  ALTER TABLE "tickets" ADD COLUMN "preferred_barber_id" integer;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_preferred_barber_id_barbers_id_fk" FOREIGN KEY ("preferred_barber_id") REFERENCES "barbers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
