# Backup and Restore Guide

## Automated Backups

### Configuration

The backup script runs automatically via cron and creates compressed SQLite backups.

**Environment Variables:**

```bash
# Required
DATA_PATH=/var/data/eutonafila.sqlite  # Path to SQLite database

# Optional
BACKUP_DIR=./backups                    # Local backup storage (default: ./backups)
BACKUP_KEEP_DAYS=30                     # Days to keep backups (default: 30)

# Cloud Storage (optional)
CLOUD_BACKUP_ENABLED=true               # Enable S3 uploads
S3_BUCKET=my-backups                    # S3 bucket name
S3_REGION=us-east-1                     # AWS region
AWS_ACCESS_KEY_ID=xxx                   # AWS credentials
AWS_SECRET_ACCESS_KEY=xxx               # AWS credentials

# Notifications (optional)
NOTIFICATION_EMAIL=admin@example.com    # Email for backup alerts
```

### Setup Automated Backups

#### On Render

Add to `render.yaml`:

```yaml
services:
  - type: web
    name: eutonafila-api
    env: node
    buildCommand: pnpm build
    startCommand: node apps/api/dist/server.js
    
    # Add cron job for backups
    cron:
      - name: database-backup
        schedule: "0 3 * * *"  # Daily at 3 AM
        command: "node scripts/backup-database.js"
```

#### On Railway

Railway doesn't support cron natively. Options:

1. **Use External Cron Service** (easiest)
   - Sign up for cron-job.org or EasyCron
   - Create job to hit backup endpoint
   - Or use GitHub Actions workflow

2. **Run in-process scheduler**
   - Use `node-cron` package
   - Schedule backup in server startup

#### Manual Cron (VPS)

```bash
# Edit crontab
crontab -e

# Add daily backup at 3 AM
0 3 * * * cd /app && node scripts/backup-database.js >> /var/log/backup.log 2>&1
```

### Manual Backup

```bash
# Run backup script manually
node scripts/backup-database.js

# Or simple copy (while server is stopped)
cp data/eutonafila.sqlite backups/eutonafila-$(date +%Y%m%d).sqlite
```

## Backup Locations

### Local Backups

```
backups/
├── eutonafila-2024-11-01.sqlite.gz  # Compressed backup
├── eutonafila-2024-11-02.sqlite.gz
└── eutonafila-2024-11-03.sqlite.gz
```

Compressed backups are ~10-20% of original size.

### Cloud Backups (S3)

If `CLOUD_BACKUP_ENABLED=true`:

```
s3://my-backups/
└── backups/
    └── 2024/
        ├── eutonafila-2024-11-01.sqlite.gz
        ├── eutonafila-2024-11-02.sqlite.gz
        └── eutonafila-2024-11-03.sqlite.gz
```

## Restore from Backup

### 1. Stop the Server

```bash
# On Render/Railway: Scale down to 0 instances
# On VPS with PM2
pm2 stop eutonafila
```

### 2. Download Backup

#### From Local Backup

```bash
# Find latest backup
ls -lt backups/

# Decompress
gunzip -c backups/eutonafila-2024-11-03.sqlite.gz > eutonafila-restored.sqlite
```

#### From S3

```bash
# Download from S3
aws s3 cp s3://my-backups/backups/2024/eutonafila-2024-11-03.sqlite.gz .

# Decompress
gunzip eutonafila-2024-11-03.sqlite.gz
```

### 3. Replace Database

```bash
# Backup current database (just in case)
cp data/eutonafila.sqlite data/eutonafila-before-restore.sqlite

# Replace with restored backup
cp eutonafila-restored.sqlite data/eutonafila.sqlite

# Or if you decompressed in place
mv eutonafila-2024-11-03.sqlite data/eutonafila.sqlite
```

### 4. Verify Database

```bash
# Check database integrity
sqlite3 data/eutonafila.sqlite "PRAGMA integrity_check;"

# Should output: ok

# Check row counts
sqlite3 data/eutonafila.sqlite "SELECT COUNT(*) FROM tickets;"
```

### 5. Restart Server

```bash
# On Render/Railway: Scale back up to 1 instance
# On VPS
pm2 restart eutonafila
```

### 6. Verify Application

```bash
# Check health endpoint
curl https://your-domain.com/health

# Should return: {"status":"ok"}

# Check queue endpoint
curl https://your-domain.com/api/shops/mineiro/queue
```

## Restore to Specific Point in Time

If you need to restore to a specific date:

```bash
# List available backups
ls -l backups/

# Choose backup from desired date
gunzip -c backups/eutonafila-2024-11-01.sqlite.gz > data/eutonafila.sqlite
```

## Emergency: Database Corruption

If database is corrupted:

### Check Integrity

```bash
sqlite3 data/eutonafila.sqlite "PRAGMA integrity_check;"
```

### Try Recovery

```bash
# Dump to SQL
sqlite3 data/eutonafila.sqlite ".dump" > dump.sql

# Create new database from dump
sqlite3 data/eutonafila-new.sqlite < dump.sql

# Replace if successful
mv data/eutonafila.sqlite data/eutonafila-corrupted.backup
mv data/eutonafila-new.sqlite data/eutonafila.sqlite
```

### Restore from Backup

If recovery fails, restore from most recent backup (see steps above).

## Monitoring Backups

### Check Last Backup

```bash
# Local
ls -lt backups/ | head -n 2

# S3
aws s3 ls s3://my-backups/backups/2024/ --recursive | tail -n 5
```

### Backup Alerts

Configure `NOTIFICATION_EMAIL` to receive:
- Daily backup success confirmations
- Immediate alerts on backup failures
- Weekly backup status summaries

### Set Up UptimeRobot Health Check

Create endpoint that checks last backup age:

```
GET /api/backup/status

Response:
{
  "lastBackup": "2024-11-03T03:00:00Z",
  "ageHours": 12,
  "status": "ok"
}
```

Alert if age > 30 hours (backup missed).

## Best Practices

1. **Test restores monthly** - Verify backups actually work
2. **Keep 30 days** - Balance storage cost with recovery needs
3. **Use cloud storage** - Local backups lost if server dies
4. **Monitor backup age** - Alert if backups stop running
5. **Encrypt backups** - Use S3 SSE or GPG encryption
6. **Document procedures** - Everyone knows how to restore

## Backup Size Estimates

| Data Volume | Database Size | Compressed Backup | Monthly Storage |
|-------------|---------------|-------------------|-----------------|
| 1 week | 10 MB | 2 MB | 60 MB |
| 1 month | 40 MB | 8 MB | 240 MB |
| 6 months | 200 MB | 40 MB | 1.2 GB |
| 1 year | 400 MB | 80 MB | 2.4 GB |

At this scale, S3 costs are negligible (~$0.05/month).

## Troubleshooting

### Backup Script Fails

```bash
# Check permissions
ls -l data/eutonafila.sqlite
ls -ld backups/

# Check disk space
df -h

# Run with verbose logging
node scripts/backup-database.js 2>&1 | tee backup.log
```

### S3 Upload Fails

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check S3 bucket access
aws s3 ls s3://my-backups/

# Test manual upload
aws s3 cp backups/test.txt s3://my-backups/test.txt
```

### Can't Restore Backup

```bash
# Check file is valid gzip
gunzip -t backups/eutonafila-2024-11-03.sqlite.gz

# Check decompressed file is SQLite
file eutonafila-restored.sqlite

# Try opening with sqlite3
sqlite3 eutonafila-restored.sqlite ".schema"
```

## Recovery Time Objectives

| Scenario | Estimated Recovery Time |
|----------|------------------------|
| Restore from local backup | 5-10 minutes |
| Restore from S3 backup | 10-15 minutes |
| Database corruption recovery | 15-30 minutes |
| Complete server rebuild | 30-60 minutes |

## Support

If you need help with backup/restore:

1. Check logs: `backups/backup.log`
2. Verify backup exists and is valid
3. Review this guide carefully
4. Contact system administrator

---

*Last updated: 2024*

