# Environment Variables

## Production Configuration Template

```bash
# ============================================================================
# Server Configuration
# ============================================================================

# Environment (production, development, test)
NODE_ENV=production

# Server port (usually auto-set by hosting platform)
PORT=3000

# ============================================================================
# Database
# ============================================================================

# Path to SQLite database file
# Render: /var/data/eutonafila.sqlite
# Railway: /app/data/eutonafila.sqlite
# VPS: /path/to/persistent/storage/eutonafila.sqlite
DATA_PATH=/var/data/eutonafila.sqlite

# ============================================================================
# Security
# ============================================================================

# JWT secret for authentication (REQUIRED)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# MUST be at least 32 characters
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_64_CHARACTER_HEX_STRING_SEE_ABOVE

# CORS allowed origin (REQUIRED)
# Must match your production domain exactly (no trailing slash)
# Development: http://localhost:5173
# Production: https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# ============================================================================
# Shop Configuration
# ============================================================================

# Shop identifier (slug)
# Used in URLs: /api/shops/mineiro/queue
SHOP_SLUG=mineiro

# ============================================================================
# Automated Backups
# ============================================================================

# Enable cloud backups (true/false)
CLOUD_BACKUP_ENABLED=true

# S3 bucket for backups
S3_BUCKET=your-backup-bucket-name

# AWS region
S3_REGION=us-east-1

# AWS credentials (if using S3 backups)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Local backup directory (default: ./backups)
# BACKUP_DIR=/path/to/backups

# Days to keep backups (default: 30)
BACKUP_KEEP_DAYS=30

# ============================================================================
# Error Monitoring (Optional but Recommended)
# ============================================================================

# Sentry DSN for backend error tracking
# Get from: https://sentry.io → Project Settings → Client Keys (DSN)
SENTRY_DSN=https://your-sentry-dsn@o123456.ingest.sentry.io/7654321

# Sentry DSN for frontend error tracking
VITE_SENTRY_DSN=https://your-frontend-sentry-dsn@o123456.ingest.sentry.io/7654321

# ============================================================================
# Notifications (Optional)
# ============================================================================

# Email for backup and error notifications
NOTIFICATION_EMAIL=admin@yourdomain.com

# SMTP settings (if sending email notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-specific-password

# ============================================================================
# Optional: Advanced Configuration
# ============================================================================

# Maximum queue size per shop (default: 50)
# MAX_QUEUE_SIZE=50

# WebSocket ping interval in seconds (default: 30)
# WS_PING_INTERVAL=30

# Rate limit: requests per minute (default: 100)
# RATE_LIMIT_MAX=100

# Log level (error, warn, info, debug)
LOG_LEVEL=warn
```

## Required Variables

These MUST be set for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATA_PATH` | SQLite file path | `/var/data/eutonafila.sqlite` |
| `JWT_SECRET` | Authentication secret (32+ chars) | Generate with crypto |
| `CORS_ORIGIN` | Allowed domain | `https://yourdomain.com` |

## Optional but Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `SHOP_SLUG` | Shop identifier | `mineiro` |
| `SENTRY_DSN` | Error tracking | None |
| `CLOUD_BACKUP_ENABLED` | Enable S3 backups | `false` |
| `NOTIFICATION_EMAIL` | Alert email | None |

## Development vs Production

### Development `.env`

```bash
NODE_ENV=development
PORT=3002
DATA_PATH=./data/eutonafila.sqlite
JWT_SECRET=dev-secret-not-for-production
CORS_ORIGIN=http://localhost:5174
SHOP_SLUG=mineiro
```

### Production Environment Variables

Set in your hosting platform dashboard (Render/Railway/etc.):

```bash
NODE_ENV=production
DATA_PATH=/var/data/eutonafila.sqlite
JWT_SECRET=<generated-64-char-hex>
CORS_ORIGIN=https://yourdomain.com
SHOP_SLUG=mineiro
```

## Security Best Practices

### 1. JWT Secret Generation

```bash
# Generate secure 64-character hex string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

Use this output as your `JWT_SECRET`.

### 2. CORS Origin

**✅ Correct:**
```bash
CORS_ORIGIN=https://yourdomain.com
```

**❌ Incorrect:**
```bash
CORS_ORIGIN=https://yourdomain.com/  # No trailing slash
CORS_ORIGIN=*  # Security risk
CORS_ORIGIN=http://yourdomain.com  # Should be HTTPS in production
```

### 3. Never Commit Secrets

```bash
# .gitignore should include:
.env
.env.local
.env.production
.env.*.local
```

## Platform-Specific Setup

### Render

Dashboard → Environment:
- Click "Add Environment Variable"
- Enter key and value
- Click "Save Changes"

### Railway

Dashboard → Variables:
- Click "New Variable"
- Enter key and value
- Auto-saves

### Vercel/Netlify (if used for frontend)

- Dashboard → Settings → Environment Variables
- Add `VITE_SENTRY_DSN` and other `VITE_*` variables

## Verification

After setting environment variables, verify they're loaded:

```bash
# Check health endpoint
curl https://yourdomain.com/health

# Should return successful response with database check

# Check logs for confirmation
# Should see: "✅ Sentry initialized" (if DSN set)
# Should NOT see: "JWT secret using default" or similar warnings
```

## Troubleshooting

### Variable Not Loading

1. **Check spelling** - Environment variables are case-sensitive
2. **Restart service** - After adding variables, redeploy
3. **Check platform** - Some platforms require restart after env var changes
4. **Verify in logs** - Add temporary log to confirm value

```typescript
// Temporary debugging
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
```

### CORS Issues

If getting CORS errors despite setting `CORS_ORIGIN`:

1. Check exact domain (including protocol)
2. No trailing slash
3. Restart service after changing
4. Clear browser cache
5. Test with curl:

```bash
curl -I https://yourdomain.com/api/health \
  -H "Origin: https://yourdomain.com"

# Should include:
# Access-Control-Allow-Origin: https://yourdomain.com
```

### Database Path Issues

If database errors on startup:

1. **Check path exists:**
```bash
ls -la /var/data/
```

2. **Check permissions:**
```bash
ls -l /var/data/eutonafila.sqlite
# Should be readable/writable by app user
```

3. **Check mount point** (Render/Railway):
- Verify persistent disk is mounted to correct path
- Path in env var must match mount path exactly

## AWS S3 Credentials (for Backups)

### Create IAM User

1. AWS Console → IAM → Users → Add User
2. User name: `eutonafila-backups`
3. Access type: Programmatic access
4. Permissions: Attach policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-backup-bucket/*",
        "arn:aws:s3:::your-backup-bucket"
      ]
    }
  ]
}
```

5. Save Access Key ID and Secret Access Key
6. Add to environment variables

## Rotation Strategy

### JWT Secret

Rotate every 6-12 months:

1. Generate new secret
2. Update environment variable
3. Redeploy
4. All users must re-login
5. Old tokens become invalid immediately

### AWS Credentials

Rotate every 90 days:

1. Create new access key in AWS IAM
2. Add new key to environment variables
3. Test backups work
4. Delete old access key in AWS IAM

---

*Last updated: 2024*

