-- Optional referral source on tickets for marketing analytics.
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "referral_source" text;
