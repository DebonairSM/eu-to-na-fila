# Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production` with all required variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# Database
DATA_PATH=/var/data/eutonafila.sqlite

# Security
JWT_SECRET=<generate-strong-secret-32+chars>
CORS_ORIGIN=https://yourdomain.com

# Shop Configuration
SHOP_SLUG=mineiro

# Backups (Optional)
CLOUD_BACKUP_ENABLED=true
S3_BUCKET=your-backup-bucket
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
BACKUP_KEEP_DAYS=30

# Monitoring (Optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
NOTIFICATION_EMAIL=admin@example.com
```

### 2. Generate Secure JWT Secret

```bash
# Generate 64-character random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Test Build Locally

```bash
# Full production build
pnpm build

# Test production server locally
NODE_ENV=production PORT=3001 pnpm start

# Verify:
# - Web app works at http://localhost:3001/mineiro
# - API works at http://localhost:3001/api/health
# - No console errors
```

### 4. Database Migration

```bash
# Run migrations
pnpm db:migrate

# Seed initial data (first time only)
pnpm db:seed

# Verify tables exist
sqlite3 data/eutonafila.sqlite ".tables"
```

### 5. Security Audit

- [ ] JWT_SECRET is strong and unique
- [ ] CORS_ORIGIN is set to production domain only
- [ ] Rate limiting enabled (check `apps/api/src/server.ts`)
- [ ] Helmet security headers enabled
- [ ] No sensitive data in environment variables committed to git

## Deployment to Render

### Step 1: Create Web Service

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:

```yaml
Name: eutonafila-mineiro
Environment: Node
Region: Oregon (US West) or closest to Brazil
Branch: main
Build Command: pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api
Start Command: node apps/api/dist/server.js
```

### Step 2: Add Environment Variables

In Render dashboard → Environment:

```
NODE_ENV=production
PORT=3000
DATA_PATH=/var/data/eutonafila.sqlite
JWT_SECRET=<your-generated-secret>
CORS_ORIGIN=https://yourdomain.com
SHOP_SLUG=mineiro
```

### Step 3: Add Persistent Disk

In Render dashboard → Add Disk:

```
Name: database-storage
Mount Path: /var/data
Size: 1 GB
```

This ensures your SQLite database persists across deployments.

### Step 4: Set Custom Domain

In Render dashboard → Settings → Custom Domain:

```
Domain: yourdomain.com
```

Follow instructions to configure DNS:

```
Type: CNAME
Name: @ (or subdomain)
Value: yourapp.onrender.com
```

### Step 5: Deploy

Click "Manual Deploy" → "Deploy latest commit"

Watch build logs for errors.

### Step 6: Verify Deployment

```bash
# Health check
curl https://yourdomain.com/health

# API
curl https://yourdomain.com/api/shops/mineiro/queue

# Web app
open https://yourdomain.com/mineiro
```

## Deployment to Railway

### Step 1: Create Project

1. Go to https://railway.app/dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository

### Step 2: Configure Service

```yaml
Build Command: pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api
Start Command: node apps/api/dist/server.js
```

### Step 3: Add Environment Variables

In Railway → Variables:

```
NODE_ENV=production
DATA_PATH=/app/data/eutonafila.sqlite
JWT_SECRET=<your-generated-secret>
CORS_ORIGIN=https://yourdomain.com
SHOP_SLUG=mineiro
```

Note: Railway auto-sets `PORT`, don't override it.

### Step 4: Add Volume

In Railway → Volumes → New Volume:

```
Mount Path: /app/data
Size: 1 GB
```

### Step 5: Set Custom Domain

In Railway → Settings → Domains → Add Domain:

```
yourdomain.com
```

Configure DNS as instructed.

### Step 6: Deploy

Railway auto-deploys on push to main.

Monitor deployment in dashboard.

## Post-Deployment Verification

### 1. Health Check

```bash
curl https://yourdomain.com/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-11-03T...",
  "uptime": 123.45,
  "checks": {
    "database": "ok",
    "websocket": {
      "status": "ok",
      "connections": 0
    }
  },
  "memory": {
    "rss": 50,
    "heapUsed": 30,
    "heapTotal": 40
  }
}
```

### 2. API Endpoints

```bash
# Get queue
curl https://yourdomain.com/api/shops/mineiro/queue

# Create ticket (test)
curl -X POST https://yourdomain.com/api/shops/mineiro/tickets \
  -H "Content-Type: application/json" \
  -d '{"serviceId": 1, "customerName": "Test", "customerPhone": "11999999999"}'
```

### 3. WebSocket Connection

Test in browser console:

```javascript
const ws = new WebSocket('wss://yourdomain.com/ws?shopId=mineiro');
ws.onopen = () => console.log('Connected');
ws.onmessage = (msg) => console.log('Message:', JSON.parse(msg.data));
```

### 4. Web App

1. Open `https://yourdomain.com/mineiro` in browser
2. Verify pages load correctly
3. Test queue display
4. Test creating ticket
5. Verify real-time updates via WebSocket

### 5. PWA Installation (on Tablet)

1. Open site in Chrome on Android tablet
2. Menu → "Add to Home Screen"
3. Verify app installs and launches fullscreen
4. Test offline mode (disconnect internet, reload)

## Setup Automated Backups

### On Render

Render supports cron jobs natively.

Create `render.yaml` in repo root:

```yaml
services:
  - type: web
    name: eutonafila-api
    env: node
    buildCommand: pnpm install --frozen-lockfile && pnpm build
    startCommand: node apps/api/dist/server.js
    
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATA_PATH
        value: /var/data/eutonafila.sqlite
    
    disk:
      name: database-storage
      mountPath: /var/data
      sizeGB: 1
    
    # Cron job for daily backups
    cron:
      - name: database-backup
        schedule: "0 3 * * *"  # Daily at 3 AM
        command: "node scripts/backup-database.js"
```

### On Railway

Railway doesn't support native cron. Options:

1. **GitHub Actions** (recommended):

Create `.github/workflows/backup.yml`:

```yaml
name: Daily Backup

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: pnpm install
      - name: Run backup
        env:
          DATA_PATH: ${{ secrets.DATA_PATH }}
          S3_BUCKET: ${{ secrets.S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: node scripts/backup-database.js
```

2. **External cron service**:
   - Use cron-job.org or EasyCron
   - Create endpoint trigger (requires implementing backup endpoint)

## Setup Uptime Monitoring

### UptimeRobot (Free)

1. Sign up at https://uptimerobot.com
2. Add New Monitor:

```
Monitor Type: HTTP(s)
Friendly Name: EuTôNaFila Mineiro
URL: https://yourdomain.com/health
Monitoring Interval: 5 minutes
```

3. Add Alert Contacts:

```
Email: your-email@example.com
SMS: +5511999999999 (optional)
```

4. Configure notifications:
   - Down alerts: Immediate
   - Up alerts: After 2 checks
   - Status page: Optional public page

### HealthChecks.io (Alternative)

More detailed monitoring with check-in pattern:

```bash
# Ping after successful backup
curl https://hc-ping.com/your-uuid
```

## Rollback Procedure

If deployment has critical issues:

### Render

1. Go to Events tab
2. Find previous successful deployment
3. Click "Redeploy"

### Railway

1. Go to Deployments tab
2. Find previous successful deployment
3. Click three dots → "Redeploy"

### Manual Rollback

```bash
# Revert to previous git commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push --force origin main
```

## Update Procedure

For non-breaking updates:

```bash
# 1. Test locally
pnpm dev
# Test all features

# 2. Build and test production build
pnpm build
NODE_ENV=production pnpm start
# Test all features

# 3. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin main

# 4. Monitor deployment
# Watch platform dashboard for build/deploy status

# 5. Verify production
curl https://yourdomain.com/health
# Test all endpoints

# 6. Monitor errors
# Check Sentry or logs for any new errors
```

## Troubleshooting Deployment

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed debugging steps.

### Common Issues

**Build fails:**
- Check build logs for errors
- Verify `pnpm-lock.yaml` is committed
- Try `pnpm install --frozen-lockfile` locally

**Database errors:**
- Verify persistent disk is mounted
- Check `DATA_PATH` environment variable
- Ensure migrations ran: `pnpm db:migrate`

**WebSocket not working:**
- Check CORS_ORIGIN matches your domain
- Verify wss:// (not ws://) in production
- Test with browser dev tools

**PWA not installing:**
- Check manifest.json is accessible
- Verify icons exist (192x192, 512x512)
- Check service worker registered (DevTools > Application)

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use HTTPS only** - Platforms handle this automatically
3. **Restrict CORS** - Set to your domain only
4. **Strong JWT secret** - 32+ characters, random
5. **Rate limiting** - Already configured in code
6. **Regular updates** - Keep dependencies current
7. **Backup encryption** - Use S3 SSE or GPG
8. **Monitor errors** - Set up Sentry or similar
9. **Access logs** - Review occasionally for suspicious activity

## Performance Tuning

SQLite configuration in `apps/api/src/db/index.ts`:

```typescript
// Enable WAL mode for better concurrency
await client.execute('PRAGMA journal_mode = WAL;');

// Increase cache size (10 MB)
await client.execute('PRAGMA cache_size = -10000;');

// Synchronous mode for balance of safety and speed
await client.execute('PRAGMA synchronous = NORMAL;');
```

## Support

- Documentation: This repo's `docs/` directory
- Issues: GitHub Issues
- Logs: Platform dashboard or `heroku logs --tail`
- Database: Check with `sqlite3 data/eutonafila.sqlite`

---

*Last updated: 2024*

