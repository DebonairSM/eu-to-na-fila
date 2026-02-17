# Render Deployment Guide

## Option 1: Using Blueprint (render.yaml)

1. In Render dashboard, go to **New > Blueprint**
2. Connect your GitHub repository
3. Render will automatically detect and use `render.yaml`
4. Review the configuration and click **Apply**

## Option 2: Manual Configuration

If Blueprint doesn't work, create the service manually:

1. In Render dashboard, go to **New > Web Service**
2. Connect your GitHub repository
3. Configure:

   **Settings:**
   - **Name**: `eutonafila`
   - **Region**: `Oregon` (or your preferred region)
   - **Branch**: `main`
   - **Root Directory**: (leave empty - uses repo root)
   - **Environment**: `Node`
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build`
   - **Start Command**: `pnpm db:migrate && node apps/api/dist/server.js`
   - **Plan**: `Starter` (or higher for production)

   **Environment Variables:**
   ```
   NODE_ENV=production
   DATABASE_URL=<postgres-connection-string-from-render-postgres-database>
   JWT_SECRET=<generate-a-secure-random-string-at-least-32-chars>
   CORS_ORIGIN=https://your-app.onrender.com
   SHOP_SLUG=mineiro
   
   # Propagandas (buy-ad page): barbershop list comes from this company. Set to your company ID so /propagandas/buy shows barbershops to select.
   # ROOT_COMPANY_ID=1
   
   # Storage Configuration (OPTIONAL)
   # If not set, files are stored locally (but will be lost on redeploy on Render)
   # For persistent storage, use Cloudflare R2 (free tier available)
   # STORAGE_PROVIDER=r2
   # STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   # STORAGE_REGION=auto
   # STORAGE_BUCKET=eutonafila-ads
   # STORAGE_ACCESS_KEY_ID=<your-r2-access-key-id>
   # STORAGE_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
   # STORAGE_PUBLIC_BASE_URL=https://<bucket-name>.<account-id>.r2.dev
   ```
   
   **Note:** Storage configuration is optional. If not provided, files are stored locally in `public/companies/`. However, on Render, local files are ephemeral and will be lost on redeploy. For production, consider setting up Cloudflare R2 (see section below).

4. **Create PostgreSQL Database (if not using existing):**
   - In Render dashboard, go to **New > PostgreSQL**
   - Select plan and region
   - Copy the **Internal Database URL** for the `DATABASE_URL` environment variable

5. **Setting Up Cloudflare R2 (Recommended):**
   
   Cloudflare R2 is free and S3-compatible. Follow these steps:
   
   a. **Create R2 Bucket:**
      - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
      - Navigate to **R2** in the left sidebar
      - Click **Create bucket**
      - Name it `eutonafila-ads` (or your preferred name)
      - Click **Create bucket**
   
   b. **Find Your Account ID:**
      - In the Cloudflare dashboard, look at the URL: `https://dash.cloudflare.com/<account-id>/r2`
      - The `<account-id>` is the long alphanumeric string in the URL
      - Or go to R2 > Settings to find your Account ID
   
   c. **Create API Token:**
      - In R2 dashboard, go to **Manage R2 API Tokens**
      - Click **Create API token**
      - Name it (e.g., "eutonafila-production")
      - Set permissions: **Object Read & Write**
      - Click **Create API token**
      - **Save the Access Key ID and Secret Access Key** (you won't see the secret again)
   
   d. **Enable Public Access (Optional):**
      - Go to your bucket settings
      - Under **Public Access**, enable public access
      - Note the public URL format: `https://<bucket-name>.<account-id>.r2.dev`
   
   e. **Set Environment Variables in Render:**
      - In Render dashboard, go to your service > **Environment**
      - Set the following variables:
        - `STORAGE_PROVIDER=r2`
        - `STORAGE_ENDPOINT=https://<your-account-id>.r2.cloudflarestorage.com`
        - `STORAGE_REGION=auto`
        - `STORAGE_BUCKET=eutonafila-ads`
        - `STORAGE_ACCESS_KEY_ID=<your-access-key-id>`
        - `STORAGE_SECRET_ACCESS_KEY=<your-secret-access-key>`
        - `STORAGE_PUBLIC_BASE_URL=https://eutonafila-ads.<your-account-id>.r2.dev`
   
   For more details, see [Storage Setup Guide](../docs/STORAGE_SETUP.md).

6. Click **Create Web Service**

## Post-Deployment

1. Set `CORS_ORIGIN` to your actual Render URL (e.g., `https://eutonafila.onrender.com`)

2. **Keep-alive (optional):** To prevent Render from spinning down after inactivity, add a GitHub repository secret:
   - Go to **Settings > Secrets and variables > Actions**
   - Add secret `RENDER_URL` with value `https://your-app.onrender.com` (no trailing slash)
   - The scheduled workflow in `.github/workflows/keep-alive.yml` will ping `/health` every 10 minutes
3. Set `DATABASE_URL` to your PostgreSQL connection string (if not already set)
4. Do not set `PORT` manually on Render. Render injects `PORT` at runtime and the app binds to it.
5. Database migrations run automatically on start, but you can manually run:
   - In Render dashboard, go to **Shell**
   - Run: `pnpm db:migrate`
   - (Optional) Run: `pnpm db:seed` for test data

### Sign in with Google

To enable customer "Sign in with Google" (and account creation via Google):

1. In Render dashboard, set these environment variables:
   - `GOOGLE_CLIENT_ID` – from Google Cloud Console (OAuth 2.0 Client ID)
   - `GOOGLE_CLIENT_SECRET` – from Google Cloud Console
   - `PUBLIC_API_URL` – your API root URL with no trailing slash (e.g. `https://your-app.onrender.com`)

2. In **Google Cloud Console** go to **APIs & Services > Credentials**, open your OAuth 2.0 Client (Web application), and under **Authorized redirect URIs** add exactly:
   - `https://your-app.onrender.com/api/auth/customer/google/callback`
   One URI works for all shops (shop slug is passed in OAuth state).

3. Sign in with Google both signs in existing customers and creates a new customer account for that shop and email when one does not exist.

## Access Your App

- **SPA**: `https://your-app.onrender.com/projects/mineiro`
- **API**: `https://your-app.onrender.com/api`
- **Health Check**: `https://your-app.onrender.com/health`

## Troubleshooting

### Error 400: redirect_uri_mismatch (Sign in with Google)

Verify the redirect URI: visit `https://your-domain/api/auth/debug/google-redirect-uri` and ensure `redirectUri` in the response exactly matches what's in Google Console.

This means the redirect URI sent to Google does not exactly match what is in **Google Cloud Console > Credentials > your OAuth client > Authorized redirect URIs**.

1. **Find the redirect URI your app uses:**
   - Local dev (pnpm dev, Vite proxy): `http://localhost:4040/api/auth/customer/google/callback` (requests go through the frontend, so use the web port 4040)
   - Local dev (API directly): `http://localhost:4041/api/auth/customer/google/callback` (API port 4041)
   - Production: `https://YOUR-API-DOMAIN/api/auth/customer/google/callback`

2. **Set PUBLIC_API_URL in production** so the redirect URI matches Google Console exactly:
   - Add `PUBLIC_API_URL=https://eutonafila.com.br` (or your domain, no trailing slash) to Render environment variables
   - This must match the domain where your API is reachable. Verify by visiting: `https://your-domain/api/auth/debug/google-redirect-uri`
   - The API uses this to build the callback URL. Without it, the fallback uses proxy headers and can differ.

3. **Add the exact redirect URI in Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Credentials
   - Open your OAuth 2.0 Client ID (Web application)
   - Under **Authorized redirect URIs**, add the full URL (e.g. `http://localhost:4040/api/auth/customer/google/callback`)
   - No trailing slash. Match protocol (http vs https), port, host, and path exactly.
   - One URI covers all shops (shop slug is in OAuth state).
   - If using same OAuth client for Gmail API (appointment reminders): add `http://localhost:3000/oauth2callback` for the get-gmail-refresh-token script.

### Customer register returns 500: "column password_hash does not exist"

The `clients` table is missing columns added by migration `0017_add_client_auth`. Apply the schema change using one of the options below.

**Option A – Run the SQL manually (use this if you are on Render free tier)**  
Render Shell is only available on paid plans. Run this SQL in your database provider’s SQL editor (e.g. **Supabase Dashboard > SQL Editor**) or via `psql`:

```sql
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "google_id" text;
CREATE UNIQUE INDEX IF NOT EXISTS "clients_shop_email_unique" ON "clients" ("shop_id", LOWER("email")) WHERE "email" IS NOT NULL;
```

After that, customer registration and Sign in with Google will work.

**Option B – Run migrations from Render Shell (paid plans only)**  
If you have Shell access, open your service > **Shell** and run `pnpm db:migrate`, then restart the service if needed.

