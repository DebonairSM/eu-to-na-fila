-- Owner and staff login identifiers (username/email). If null, literal "owner"/"staff" is used at login.
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "owner_username" text;
ALTER TABLE "shops" ADD COLUMN IF NOT EXISTS "staff_username" text;
