# Troubleshooting Guide

## Quick Diagnostics

### 1. Check Service Status

```bash
# Health endpoint
curl https://yourdomain.com/health

# Expected response:
{
  "status": "ok",  # or "degraded"
  "checks": {
    "database": "ok",
    "websocket": { "status": "ok", "connections": 5 }
  }
}
```

### 2. Check Logs

**Render:**
```bash
# Real-time logs
render logs --tail

# Or in dashboard: Logs tab
```

**Railway:**
```bash
# In dashboard: View Logs button
```

### 3. Check Database

```bash
# Connect to server (if you have shell access)
sqlite3 /var/data/eutonafila.sqlite

# Check tables
.tables

# Check row counts
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM shops;

# Check database integrity
PRAGMA integrity_check;
```

## Common Issues

### 🔴 Server Won't Start

**Symptoms:**
- Health check fails
- Site doesn't load
- "Application Error" message

**Diagnosis:**
```bash
# Check logs for startup errors
render logs --tail
# or Railway logs

# Common errors:
# - "Cannot find module" → Missing dependency
# - "ENOENT: no such file" → Path issue
# - "Address already in use" → Port conflict
```

**Solutions:**

1. **Missing dependencies:**
```bash
# Rebuild with frozen lockfile
pnpm install --frozen-lockfile
pnpm build
```

2. **Database path issue:**
```bash
# Check DATA_PATH environment variable
# Should be: /var/data/eutonafila.sqlite (Render)
# Or: /app/data/eutonafila.sqlite (Railway)
```

3. **Environment variables:**
```bash
# Verify all required vars are set:
NODE_ENV=production
PORT=3000 (or auto-set by platform)
DATA_PATH=/var/data/eutonafila.sqlite
JWT_SECRET=xxx
CORS_ORIGIN=https://yourdomain.com
```

### 🔴 Database Errors

**Symptoms:**
- API returns 500 errors
- "Database error" in logs
- Health check shows `"database": "error"`

**Diagnosis:**
```bash
# Check if database file exists
ls -l /var/data/eutonafila.sqlite

# Check file permissions
ls -l /var/data/

# Check disk space
df -h
```

**Solutions:**

1. **Database doesn't exist:**
```bash
# Run migrations
pnpm db:migrate

# Or create fresh database
pnpm db:seed
```

2. **Database corrupted:**
```bash
# Check integrity
sqlite3 /var/data/eutonafila.sqlite "PRAGMA integrity_check;"

# If corrupted, restore from backup
# See BACKUP_RESTORE.md
```

3. **Disk full:**
```bash
# Check disk usage
df -h

# Clean old logs if needed
# Consider increasing disk size in platform dashboard
```

4. **Permission denied:**
```bash
# Fix permissions
chmod 644 /var/data/eutonafila.sqlite
chmod 755 /var/data/
```

### 🔴 WebSocket Not Working

**Symptoms:**
- Real-time updates don't work
- Console shows "WebSocket connection failed"
- Tickets don't appear without refresh

**Diagnosis:**
```bash
# Test WebSocket in browser console:
const ws = new WebSocket('wss://yourdomain.com/ws?shopId=mineiro');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
ws.onclose = (e) => console.log('Closed:', e.code, e.reason);
```

**Solutions:**

1. **CORS issue:**
```bash
# Check CORS_ORIGIN environment variable
# Should match your domain exactly:
CORS_ORIGIN=https://yourdomain.com
# NOT: https://yourdomain.com/
# NOT: http://yourdomain.com (unless dev)
```

2. **Using ws:// instead of wss://:**
```typescript
# In production, always use wss://
const ws = new WebSocket('wss://yourdomain.com/ws');
// NOT: ws://yourdomain.com/ws
```

3. **Proxy/Load balancer issue:**
```bash
# Check health endpoint WebSocket status
curl https://yourdomain.com/health

# Should show:
"websocket": { "status": "ok", "connections": N }
```

4. **Shop ID mismatch:**
```bash
# Ensure shopId parameter matches database:
ws://domain/ws?shopId=mineiro

# Check shops table:
sqlite3 /var/data/eutonafila.sqlite "SELECT slug FROM shops;"
```

### 🔴 PWA Not Installing

**Symptoms:**
- "Add to Home Screen" option doesn't appear
- PWA install banner doesn't show
- Service worker not registering

**Diagnosis:**
```bash
# Open DevTools > Application tab
# Check:
# - Manifest section: Should show no errors
# - Service Workers section: Should show registered worker
```

**Solutions:**

1. **Manifest not found:**
```bash
# Verify manifest.json exists and is accessible
curl https://yourdomain.com/mineiro/manifest.json

# Should return valid JSON with icons
```

2. **Icons missing:**
```bash
# Check icons exist
curl -I https://yourdomain.com/mineiro/icon-192.png
curl -I https://yourdomain.com/mineiro/icon-512.png

# Should return 200 OK
# If 404, see apps/web/public/PWA_SETUP.md
```

3. **Service worker not registered:**
```javascript
# Check browser console for errors
# Look for: "Service Worker registered"

# Common issues:
# - Served over HTTP (must be HTTPS)
# - Scope mismatch
# - JavaScript error in sw.js
```

4. **HTTPS required:**
```bash
# PWA only works on HTTPS (or localhost)
# Verify site uses https://
```

### 🔴 API Returns 404

**Symptoms:**
- All API calls return 404
- Routes not found
- "Cannot GET /api/..."

**Diagnosis:**
```bash
# Test health endpoint
curl https://yourdomain.com/health

# If health works but /api doesn't:
# Routes not registered properly
```

**Solutions:**

1. **Check server logs:**
```bash
# Look for route registration messages
"Registered routes:"
```

2. **Verify build:**
```bash
# Ensure routes are compiled
ls apps/api/dist/routes/
# Should contain: queue.js, tickets.js, status.js
```

3. **Check route registration:**
```typescript
# In apps/api/src/server.ts
# Ensure routes are registered:
fastify.register(queueRoutes);
fastify.register(ticketRoutes);
fastify.register(statusRoutes);
```

### 🔴 CORS Errors

**Symptoms:**
- Browser console: "CORS policy: No 'Access-Control-Allow-Origin'"
- API calls fail from web app
- WebSocket connection blocked

**Diagnosis:**
```bash
# Check CORS headers
curl -I https://yourdomain.com/api/health \
  -H "Origin: https://yourdomain.com"

# Should include:
# Access-Control-Allow-Origin: https://yourdomain.com
```

**Solutions:**

1. **Set CORS_ORIGIN:**
```bash
CORS_ORIGIN=https://yourdomain.com

# Must match exactly (no trailing slash)
```

2. **Development vs Production:**
```bash
# Development:
CORS_ORIGIN=http://localhost:5173

# Production:
CORS_ORIGIN=https://yourdomain.com
```

3. **Wildcard not recommended:**
```bash
# Don't use: CORS_ORIGIN=*
# Security risk - be specific
```

### 🔴 High Memory Usage

**Symptoms:**
- Server crashes with "Out of memory"
- Health endpoint shows high memory
- Platform shows high memory usage

**Diagnosis:**
```bash
# Check memory in health endpoint
curl https://yourdomain.com/health

# Look at:
"memory": {
  "rss": 500,      # Resident set size (total memory)
  "heapUsed": 400, # Heap memory used
  "heapTotal": 450 # Total heap allocated
}
# Values in MB
```

**Solutions:**

1. **Normal for SQLite:**
```bash
# 50-100 MB is normal
# 200-300 MB is acceptable under load
# 500+ MB may indicate leak
```

2. **WebSocket connections:**
```bash
# Check connection count
curl https://yourdomain.com/health

"websocket": { "connections": 5 }

# Normal: 5-30 connections
# High: 100+ (may indicate leak)
```

3. **Restart service:**
```bash
# In platform dashboard:
# Manual Deploy → Redeploy
# This restarts the service
```

4. **Memory leak investigation:**
```bash
# Check logs for errors
# Look for unclosed connections
# Review recent code changes
```

### 🔴 Slow Performance

**Symptoms:**
- API responses take >1 second
- Queue page loads slowly
- Database queries slow

**Diagnosis:**
```bash
# Check database query performance
sqlite3 /var/data/eutonafila.sqlite

EXPLAIN QUERY PLAN
SELECT * FROM tickets WHERE shopId = 1 AND status = 'waiting';

# Should use index, not SCAN TABLE
```

**Solutions:**

1. **Add database indexes:**
```sql
# Check existing indexes
.indexes tickets

# Add if missing:
CREATE INDEX idx_tickets_shop_status 
ON tickets(shopId, status);

CREATE INDEX idx_tickets_created 
ON tickets(createdAt);
```

2. **Enable WAL mode:**
```sql
PRAGMA journal_mode = WAL;
PRAGMA cache_size = -10000;  # 10MB cache
```

3. **Check data volume:**
```sql
# Count tickets
SELECT COUNT(*) FROM tickets;

# If >10,000, consider archiving old tickets
DELETE FROM tickets 
WHERE status IN ('completed', 'cancelled') 
AND createdAt < date('now', '-30 days');
```

4. **Network latency:**
```bash
# Test from different location
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/health

# Check:
# - time_total: <500ms is good
# - time_starttransfer: <300ms is good
```

## Error Codes Reference

| Error Code | Status | Meaning | Solution |
|------------|--------|---------|----------|
| `VALIDATION_ERROR` | 400 | Invalid input | Check request data |
| `UNAUTHORIZED` | 401 | Missing/invalid auth | Check JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions | Check user role |
| `NOT_FOUND` | 404 | Resource doesn't exist | Verify ID/slug |
| `CONFLICT` | 409 | Business rule violation | Check status transitions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `INTERNAL_ERROR` | 500 | Server error | Check logs |

## Logging Best Practices

### View Logs

**Render:**
```bash
# CLI
render logs --tail --service your-service

# Dashboard
Logs tab → Filter by level
```

**Railway:**
```bash
# Dashboard only
View Logs → Filter by text
```

### Search Logs

```bash
# Search for errors
grep "ERROR" logs.txt

# Search for specific endpoint
grep "/api/tickets" logs.txt

# Search for specific user/ticket
grep "ticketId: 123" logs.txt
```

### Log Levels

```
ERROR - Critical issues (always investigate)
WARN - Potential problems (review regularly)
INFO - Normal operations (useful for debugging)
DEBUG - Detailed execution (dev only)
```

## When to Escalate

Contact system administrator if:

1. **Data loss** - Tickets disappeared
2. **Security issue** - Unauthorized access
3. **Extended downtime** - >15 minutes
4. **Database corruption** - Integrity check fails
5. **Persistent errors** - Same error after troubleshooting

## Prevention Checklist

- [ ] Automated backups running daily
- [ ] Uptime monitoring configured
- [ ] Error tracking (Sentry) set up
- [ ] Disk space monitored (>20% free)
- [ ] Dependencies up to date
- [ ] Logs reviewed weekly
- [ ] Performance metrics reviewed monthly

## Useful Commands

```bash
# Check service status
curl https://yourdomain.com/health

# Test API endpoint
curl https://yourdomain.com/api/shops/mineiro/queue

# Test WebSocket
wscat -c wss://yourdomain.com/ws?shopId=mineiro

# Check database
sqlite3 /var/data/eutonafila.sqlite ".tables"

# Check disk space
df -h

# Check memory
free -h

# View recent logs
tail -f /var/log/app.log

# Search logs
grep "ERROR" /var/log/app.log

# Check process
ps aux | grep node
```

## Getting Help

1. **Check this guide** - Most common issues covered
2. **Check logs** - Error messages point to issues
3. **Search GitHub Issues** - Others may have faced same issue
4. **Create GitHub Issue** - Provide logs and steps to reproduce
5. **Contact support** - Include health endpoint output and recent logs

---

*Last updated: 2024*

