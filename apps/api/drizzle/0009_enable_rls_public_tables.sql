-- Enable Row Level Security on all public tables exposed to PostgREST (Supabase).
-- With RLS enabled and no permissive policies for anon/authenticated,
-- direct API access using the publishable (anon) key cannot read or write data.
-- The app uses a direct Postgres connection (Drizzle) and Supabase Storage
-- with the service role key; both continue to work (service role and direct
-- connection use a privileged role / bypass RLS).

ALTER TABLE "__drizzle_migrations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company_admins" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "barbers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company_ads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "shops" ENABLE ROW LEVEL SECURITY;
