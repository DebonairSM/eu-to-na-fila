# Database Backup Guide (Supabase / PostgreSQL)

This project uses Supabase as the database provider. Supabase runs on PostgreSQL. This document explains how to keep your data backed up and recoverable.

## Supabase Built-in Backups

Supabase provides backup capabilities depending on your plan:

- **Free tier**: No automatic backups; you must create your own.
- **Pro tier and above**: Daily backups with point-in-time recovery (PITR) available on higher plans.

Check your plan in the Supabase dashboard under **Project Settings > Database** for backup retention and PITR options.

## Manual Backup with pg_dump

Since Supabase uses PostgreSQL, you can create backups using `pg_dump` with your database connection string.

### Full backup (custom format, recommended)

```bash
pg_dump "$DATABASE_URL" -Fc -f backup-$(date +%Y%m%d-%H%M).dump
```

The custom format (`-Fc`) is compressed and suitable for restores with `pg_restore`.

### Plain SQL backup (portable)

```bash
pg_dump "$DATABASE_URL" -f backup-$(date +%Y%m%d).sql
```

Use plain SQL if you want to inspect or edit the dump, or restore into a different setup.

### Getting your connection string

1. Supabase Dashboard > **Project Settings** > **Database**
2. Use the **Connection string** (URI format) with your password, or the **Connection pooling** string for pooled connections.

Use the same format as your app (direct or pooled) depending on how you connect.

## Restoring from a Backup

### From custom format (`.dump`)

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists backup-20250204-1200.dump
```

`--clean` drops objects before recreating them. Use with caution on production.

### From plain SQL

```bash
psql "$DATABASE_URL" -f backup-20250204.sql
```

## Backup Before Migrations

Migrations can modify or drop data. Always backup before running them:

1. Run a `pg_dump` (or scripted backup) before deploy.
2. Store the backup in durable storage (e.g. S3, R2, or local disk).
3. Run migrations only after the backup completes successfully.

Example sequence:

```bash
# 1. Backup
pg_dump "$DATABASE_URL" -Fc -f pre-migration-$(date +%Y%m%d-%H%M).dump

# 2. Upload to cloud storage (optional)
# aws s3 cp pre-migration-*.dump s3://your-bucket/backups/

# 3. Run migrations
pnpm db:migrate
```

## Automated Backups

Options for scheduled backups:

1. **GitHub Actions**: Workflow that runs `pg_dump`, uploads to S3/R2, and rotates old backups.
2. **Cron on a server**: Job that has access to `DATABASE_URL` and runs the same backup logic.
3. **Supabase Pro+**: Enable and configure built-in daily backups and PITR.

Backups should be stored off the database host (e.g. S3, R2) so they survive issues with Supabase or the project.

## Safer Migration Practices

1. **Backup first**: Always take a backup before running migrations.
2. **Test on a copy**: Restore a backup to a staging database and run migrations there.
3. **Split breaking changes**: Use multi-step migrations instead of dropping columns or tables in a single step.
4. **Review migration files**: Check Drizzle migrations in `apps/api/drizzle/` for destructive operations before applying them.

## Supabase API security (RLS)

Row Level Security (RLS) is enabled on all public tables. That locks down Supabase’s auto-generated PostgREST API: requests using the publishable (anon) key cannot read or write any rows, because there are no permissive policies for the anon role.

The app is unchanged:

- **Data access**: The API uses a direct Postgres connection (`DATABASE_URL`) and Drizzle, not the Supabase REST API. Migrations and app code run with a privileged DB role and are not restricted by RLS.
- **Storage**: Supabase Storage (e.g. ads) is used only from the API with the service role key, which bypasses RLS.

So only your backend (and direct DB connections with the same credentials) can access data. If the anon key is ever exposed, it still cannot read or modify table data. The migration that enables RLS is `0009_enable_rls_public_tables.sql` in `apps/api/drizzle/`. It has already been applied to the linked Supabase project; for other environments, run migrations as usual so RLS is applied there too.

## Existing Script Note

The `scripts/backup-database.js` script in this repo targets SQLite (file-based) and does not work with Supabase/PostgreSQL. For Supabase, use `pg_dump` or a script that invokes `pg_dump` as described above.
