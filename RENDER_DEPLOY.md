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
   PORT=3000
   DATABASE_URL=<postgres-connection-string-from-render-postgres-database>
   JWT_SECRET=<generate-a-secure-random-string-at-least-32-chars>
   CORS_ORIGIN=https://your-app.onrender.com
   SHOP_SLUG=mineiro
   ```

4. **Create PostgreSQL Database (if not using existing):**
   - In Render dashboard, go to **New > PostgreSQL**
   - Select plan and region
   - Copy the **Internal Database URL** for the `DATABASE_URL` environment variable

5. Click **Create Web Service**

## Post-Deployment

1. Set `CORS_ORIGIN` to your actual Render URL (e.g., `https://eutonafila.onrender.com`)
2. Set `DATABASE_URL` to your PostgreSQL connection string (if not already set)
3. Database migrations run automatically on start, but you can manually run:
   - In Render dashboard, go to **Shell**
   - Run: `pnpm db:migrate`
   - (Optional) Run: `pnpm db:seed` for test data

## Access Your App

- **SPA**: `https://your-app.onrender.com/mineiro`
- **API**: `https://your-app.onrender.com/api`
- **Health Check**: `https://your-app.onrender.com/health`

