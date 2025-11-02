# Production Deployment Checklist

Use this checklist before deploying to production.

## Pre-Deployment

### Code Readiness

- [ ] All tests pass (when implemented)
- [ ] No console.log statements in production code
- [ ] No commented-out code blocks
- [ ] TypeScript strict mode enabled and passing
- [ ] No linter errors or warnings
- [ ] Git repository clean (no uncommitted changes)

### Environment Configuration

- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` generated (64-char random hex)
- [ ] `CORS_ORIGIN` set to production domain
- [ ] `DATA_PATH` points to persistent storage
- [ ] `SHOP_SLUG` configured correctly
- [ ] All required environment variables documented

### Security Review

- [ ] JWT_SECRET is strong and unique (not default)
- [ ] CORS restricted to production domain only
- [ ] Rate limiting enabled (100 req/min)
- [ ] Helmet security headers enabled
- [ ] No sensitive data in environment variables
- [ ] No API keys or secrets committed to git
- [ ] HTTPS enforced (handled by hosting platform)

### Database Setup

- [ ] Migrations created and tested
- [ ] Database seeded with initial data
- [ ] Indexes added for performance
- [ ] WAL mode enabled for SQLite
- [ ] Persistent storage configured (Render/Railway disk)
- [ ] Backup location configured

### Build Verification

- [ ] `pnpm build:web` succeeds
- [ ] `pnpm integrate:web` copies files correctly
- [ ] `pnpm build:api` succeeds
- [ ] Production build tested locally
- [ ] No build warnings or errors
- [ ] Static assets accessible

## Deployment

### Platform Configuration

- [ ] Hosting platform account created (Render/Railway)
- [ ] Repository connected to platform
- [ ] Build command configured correctly
- [ ] Start command configured correctly
- [ ] Environment variables added to platform
- [ ] Persistent disk/volume created and mounted
- [ ] Custom domain configured
- [ ] DNS records updated (CNAME/A record)
- [ ] SSL certificate provisioned automatically

### Initial Deployment

- [ ] First deployment triggered
- [ ] Build logs reviewed for errors
- [ ] Deployment completed successfully
- [ ] Health endpoint responding: `/health`
- [ ] Database initialized correctly
- [ ] No error logs on startup

## Post-Deployment Verification

### API Testing

- [ ] Health check: `GET /health` returns 200
- [ ] Queue endpoint: `GET /api/shops/mineiro/queue` works
- [ ] Create ticket: `POST /api/shops/mineiro/tickets` works
- [ ] Update status: `PATCH /api/tickets/:id/status` works
- [ ] Rate limiting works (test >100 requests)
- [ ] Error responses are JSON formatted

### Web Application

- [ ] Site loads at production URL
- [ ] All pages accessible (Queue, Join, Status)
- [ ] React Router works (no 404 on refresh)
- [ ] WebSocket connects successfully
- [ ] Real-time updates work (test ticket creation)
- [ ] No console errors in browser DevTools
- [ ] Service worker registers successfully

### PWA Functionality

- [ ] Manifest accessible: `/mineiro/manifest.json`
- [ ] Icons load: `/mineiro/icon-192.png`, `/mineiro/icon-512.png`
- [ ] "Add to Home Screen" prompt appears on tablet
- [ ] App installs successfully on Android tablet
- [ ] App launches fullscreen without browser chrome
- [ ] Offline mode works (cached content loads)
- [ ] Service worker updates correctly

### WebSocket Testing

- [ ] WebSocket connects: `wss://domain/ws?shopId=mineiro`
- [ ] Connection established event received
- [ ] Ticket created event broadcasts correctly
- [ ] Status change event broadcasts correctly
- [ ] Reconnects automatically on disconnect
- [ ] Multiple clients can connect simultaneously

### Database Verification

- [ ] Shop data exists and is correct
- [ ] Services configured properly
- [ ] Barbers added if needed
- [ ] Test ticket can be created
- [ ] Ticket status can be updated
- [ ] Queue positions calculate correctly
- [ ] Wait times estimate reasonably

## Monitoring Setup

### Error Monitoring

- [ ] Sentry account created
- [ ] Backend project created in Sentry
- [ ] Frontend project created in Sentry
- [ ] `SENTRY_DSN` environment variable set
- [ ] Test error sent and appears in Sentry
- [ ] Email alerts configured
- [ ] Alert rules set up (>10 errors in 5 minutes)

### Uptime Monitoring

- [ ] UptimeRobot account created
- [ ] Monitor configured for `/health` endpoint
- [ ] Check interval set to 5 minutes
- [ ] Alert email configured
- [ ] Optional: SMS alerts configured
- [ ] Optional: Status page created

### Backup System

- [ ] Backup script tested locally
- [ ] S3 bucket created (if using cloud backup)
- [ ] AWS credentials configured
- [ ] `CLOUD_BACKUP_ENABLED=true` set
- [ ] Automated backup schedule configured
- [ ] Manual backup tested and verified
- [ ] Restore procedure tested
- [ ] Backup notifications configured

## Documentation

### Internal Documentation

- [ ] All code has JSDoc comments
- [ ] README updated with production info
- [ ] Architecture docs reviewed and current
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment procedure documented

### Operational Documentation

- [ ] Barber training guide created
- [ ] PWA installation instructions written
- [ ] Troubleshooting guide reviewed
- [ ] Backup/restore procedure documented
- [ ] Emergency contacts listed
- [ ] Support escalation path defined

## Performance Testing

### Load Testing

- [ ] Test with 5 barbers logged in
- [ ] Test with 30 concurrent customers
- [ ] Create 20 tickets in quick succession
- [ ] Verify real-time updates with multiple clients
- [ ] Check memory usage under load (should be <200 MB)
- [ ] Verify response times (<500ms for API calls)
- [ ] Database performance acceptable

### Mobile Testing

- [ ] Test on 10-inch Android tablet
- [ ] Test in landscape orientation
- [ ] Test in portrait orientation
- [ ] Touch targets large enough (48x48px minimum)
- [ ] Forms work with on-screen keyboard
- [ ] No horizontal scrolling required
- [ ] Text readable without zooming

## Security Audit

### Access Control

- [ ] Public endpoints work without auth
- [ ] Protected endpoints return 401 without auth (when implemented)
- [ ] JWT tokens expire correctly (24 hours)
- [ ] Rate limiting blocks excessive requests
- [ ] CORS blocks unauthorized origins

### Data Protection

- [ ] HTTPS enforced (verify no HTTP access)
- [ ] No sensitive data in client-side code
- [ ] No API keys exposed in frontend
- [ ] Database backups encrypted (S3 SSE)
- [ ] Error messages don't leak sensitive info

## Business Continuity

### Disaster Recovery

- [ ] Backup restore procedure tested
- [ ] Recovery Time Objective documented (<1 hour)
- [ ] Database backup verified and downloadable
- [ ] Multiple team members know restore procedure
- [ ] Rollback procedure tested

### Maintenance Plan

- [ ] Weekly log review scheduled
- [ ] Monthly security update check scheduled
- [ ] Quarterly dependency update scheduled
- [ ] Backup verification scheduled (monthly)
- [ ] Performance review scheduled (quarterly)

## Launch Day

### Final Checks (Day Before)

- [ ] All checklist items above completed
- [ ] Production URL shared with barbers
- [ ] Training session scheduled
- [ ] Support contact info distributed
- [ ] Emergency procedures reviewed
- [ ] Rollback plan ready if needed

### Go Live

- [ ] Announce downtime window (if migrating)
- [ ] Perform final backup of old system
- [ ] Switch DNS to new system
- [ ] Verify new system accessible
- [ ] Monitor error rates for first hour
- [ ] Monitor performance metrics
- [ ] Stay available for barber questions
- [ ] Send "all clear" message when stable

### First 24 Hours

- [ ] Monitor Sentry for errors
- [ ] Check UptimeRobot status
- [ ] Review server logs
- [ ] Verify backups running
- [ ] Collect barber feedback
- [ ] Note any issues for fixes
- [ ] Confirm WebSocket stability

### First Week

- [ ] Daily error rate review
- [ ] Performance metrics review
- [ ] Barber satisfaction check-in
- [ ] Any urgent bugs fixed
- [ ] Documentation updated based on feedback
- [ ] Backup system verified working

## Success Criteria

Production deployment is successful when:

- ✅ System accessible at production URL
- ✅ Zero critical errors in first 24 hours
- ✅ All 5 barbers using system successfully
- ✅ Real-time updates working reliably
- ✅ PWA installed on all tablets
- ✅ Automated backups running daily
- ✅ Error monitoring active and alerting
- ✅ Uptime monitoring active
- ✅ Barbers trained and comfortable
- ✅ Support process working

## Rollback Plan

If critical issues occur:

1. **Immediate** (Minutes)
   - Scale service to 0 (stop taking requests)
   - Assess severity of issue
   - Decide: fix forward or rollback

2. **Rollback** (5-10 Minutes)
   - Revert to previous git commit
   - Redeploy previous version
   - Verify old version works
   - Notify barbers of temporary issue

3. **Fix Forward** (Variable)
   - Deploy hotfix to production
   - Monitor for stability
   - Keep old version ready
   - Document issue for post-mortem

4. **Post-Incident** (After resolution)
   - Write incident report
   - Update runbooks
   - Add monitoring for similar issues
   - Plan preventive measures

---

*Last updated: 2024*

