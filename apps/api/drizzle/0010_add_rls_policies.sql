-- Add explicit RLS policies to satisfy Supabase linter and document intent.
-- The app uses direct Postgres (Drizzle) and service role for Storage; both bypass RLS.
-- These policies explicitly deny PostgREST access for anon/authenticated (PUBLIC).
-- Idempotent: DROP IF EXISTS allows re-running when policies were applied via MCP or prior run.

DROP POLICY IF EXISTS "deny_public_api_access" ON public."__drizzle_migrations";
CREATE POLICY "deny_public_api_access" ON public."__drizzle_migrations" FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.audit_log;
CREATE POLICY "deny_public_api_access" ON public.audit_log FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.barbers;
CREATE POLICY "deny_public_api_access" ON public.barbers FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.companies;
CREATE POLICY "deny_public_api_access" ON public.companies FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.company_admins;
CREATE POLICY "deny_public_api_access" ON public.company_admins FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.company_ads;
CREATE POLICY "deny_public_api_access" ON public.company_ads FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.services;
CREATE POLICY "deny_public_api_access" ON public.services FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.shops;
CREATE POLICY "deny_public_api_access" ON public.shops FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
--> statement-breakpoint
DROP POLICY IF EXISTS "deny_public_api_access" ON public.tickets;
CREATE POLICY "deny_public_api_access" ON public.tickets FOR ALL TO PUBLIC USING (false) WITH CHECK (false);
