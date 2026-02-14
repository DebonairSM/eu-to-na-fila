-- Add state and city columns (address remains for street/neighborhood)
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "city" text;
