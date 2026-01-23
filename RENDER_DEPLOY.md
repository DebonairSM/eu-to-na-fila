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
2. Set `DATABASE_URL` to your PostgreSQL connection string (if not already set)
3. Do not set `PORT` manually on Render. Render injects `PORT` at runtime and the app binds to it.
3. Database migrations run automatically on start, but you can manually run:
   - In Render dashboard, go to **Shell**
   - Run: `pnpm db:migrate`
   - (Optional) Run: `pnpm db:seed` for test data

## Access Your App

- **SPA**: `https://your-app.onrender.com/mineiro`
- **API**: `https://your-app.onrender.com/api`
- **Health Check**: `https://your-app.onrender.com/health`

