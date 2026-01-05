DO $$ BEGIN
  ALTER TABLE "shops" ADD COLUMN "owner_pin" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;