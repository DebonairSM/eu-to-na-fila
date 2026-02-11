-- Barber revenue share: barber's percentage of service revenue (0-100). Null = default 100.
ALTER TABLE "barbers" ADD COLUMN IF NOT EXISTS "revenue_share_percent" integer;
