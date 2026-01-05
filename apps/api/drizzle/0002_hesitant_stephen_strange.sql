DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "staff_pin" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;