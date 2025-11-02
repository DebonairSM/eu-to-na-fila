# Scale Decisions: Right-Sizing for Single Barbershop

## Overview

This document explains architectural decisions made to keep EuTôNaFila appropriately scaled for its actual use case: a single barbershop in Brazil with ~5 barbers serving customers throughout the day.

## Target Scale

### Current Reality
- **Single barbershop deployment** (not multi-tenant SaaS)
- **5 barbers** working simultaneously at peak hours
- **~30 concurrent users** maximum (barbers + customers checking status)
- **~100-200 tickets per day** typical volume
- **Single SQLite database** serving one physical location

### Traffic Patterns
- Peak hours: Weekday evenings, Saturday all day
- Off-peak: Weekday mornings, Sunday (closed or light)
- Most traffic: Real-time queue updates via WebSocket
- API requests: Mostly reads (queue status), occasional writes (join queue, update status)

## What We're NOT Doing (And Why)

These decisions prevent over-engineering and keep the system maintainable for a single-shop deployment.

---

### ❌ TanStack Query

**Decision:** Skip it. Use vanilla `useState` + `fetch` + WebSocket.

**Why We Don't Need It:**

1. **Real-time updates already handled**
   - WebSocket provides instant queue updates
   - No need for sophisticated cache invalidation
   - Server pushes changes to all clients immediately

2. **Scale doesn't justify complexity**
   - 30 concurrent users is tiny
   - Network requests are infrequent
   - Simple useState pattern is sufficient
   - No pagination, infinite scroll, or complex data graphs

3. **Current implementation works**
   ```typescript
   // This is perfectly fine at this scale:
   const [tickets, setTickets] = useState<Ticket[]>([]);
   
   useEffect(() => {
     loadQueue(); // Simple fetch
   }, []);
   
   useWebSocket('mineiro', (event) => {
     if (event.type === 'ticket.created') {
       loadQueue(); // Re-fetch on update
     }
   });
   ```

4. **Maintenance burden**
   - TanStack Query adds learning curve
   - Query keys to manage
   - Cache invalidation strategies to understand
   - More dependencies to maintain

**When to Reconsider:**
- Multi-shop deployment (100+ concurrent shops)
- Complex data relationships requiring normalized cache
- Offline-first requirements beyond basic PWA
- Need for advanced features like optimistic updates, prefetching

---

### ❌ OpenTelemetry

**Decision:** Skip it. Use Pino logs + Sentry for errors + simple uptime monitoring.

**Why We Don't Need It:**

1. **Scale doesn't justify overhead**
   - OpenTelemetry adds CPU/memory overhead for tracing
   - At 5 barbers, performance impact is noticeable
   - Distributed tracing is overkill for single Node process
   - Metrics like "p99 latency" don't matter at this scale

2. **Problems are immediately obvious**
   - 5 barbers will tell you instantly if something's broken
   - No need for 24/7 monitoring dashboards
   - Simple error alerts via email/Sentry are sufficient
   - Tail logs when debugging (simple `heroku logs --tail` or Railway logs)

3. **Existing tools are sufficient**
   ```typescript
   // Pino logger via Fastify - perfect for this scale
   fastify.log.info('Ticket created', { ticketId, shopId });
   fastify.log.error({ err }, 'Database error');
   
   // Sentry catches exceptions
   Sentry.captureException(error);
   
   // Health endpoint for uptime monitoring
   GET /health -> { status: 'ok', db: 'connected' }
   ```

4. **Complexity vs. value**
   - OpenTelemetry setup is non-trivial
   - Requires exporter configuration (Jaeger, Zipkin, etc.)
   - Need separate infrastructure to collect/visualize traces
   - Learning curve for span creation, context propagation

**When to Reconsider:**
- Multi-shop SaaS with hundreds of deployments
- Microservices architecture (currently monolith)
- Performance optimization needed across distributed services
- Compliance/audit requirements for detailed request tracing

---

### ❌ Native Android App

**Decision:** Delete `apps/android/` directory. Use PWA on tablets.

**Why We Don't Need It:**

1. **PWA provides same functionality**
   - Installable on Android tablets (Add to Home Screen)
   - Works offline with service worker
   - Push notifications available (if needed later)
   - Fullscreen mode for app-like experience
   - Auto-updates when we deploy (no app store delays)

2. **Maintenance burden eliminated**
   - No separate Kotlin codebase to maintain
   - No Play Store submission/review process
   - No separate release cycle for mobile
   - No platform-specific bugs to fix
   - One codebase for all devices (web + tablets)

3. **Deployment simplicity**
   ```bash
   # PWA deployment: Just deploy web app
   pnpm build:web
   pnpm integrate:web
   pnpm build:api
   
   # Native app would require:
   # - Build APK
   # - Sign with keystore
   # - Distribute via Play Store or sideload
   # - Update process for each tablet
   # - Version management
   ```

4. **Barber experience is equivalent**
   - Open Chrome on tablet
   - Navigate to shop URL
   - Tap "Add to Home Screen"
   - Icon appears, launches fullscreen
   - Indistinguishable from native app

**When to Reconsider:**
- Need device hardware access (Bluetooth printer, NFC, etc.)
- Complex offline-first requirements (multi-day offline operation)
- Performance issues with web rendering (unlikely for this app)
- App Store presence required for credibility/discovery

---

## What We ARE Doing

### ✅ PWA (Progressive Web App)

**Why:** Best of both worlds - installable, offline-capable, auto-updating, simple to maintain.

**Implementation:**
- `manifest.json` for installability
- Service worker for offline asset caching
- Responsive design for tablets
- Touch-optimized UI

### ✅ Sentry Error Monitoring

**Why:** Catch production errors without overhead of full observability platform.

**Implementation:**
- Free tier supports this scale
- Email alerts on errors
- Stack traces for debugging
- Breadcrumbs for context

### ✅ Automated Backups

**Why:** SQLite database is a single file - must protect it.

**Implementation:**
- Daily cron job
- Upload to S3/Dropbox
- Keep 30 days of backups
- Documented restore procedure

### ✅ Uptime Monitoring

**Why:** Know immediately if server goes down.

**Implementation:**
- UptimeRobot (free tier)
- Ping `/health` every 5 minutes
- Email/SMS alerts on downtime
- Simple status page

### ✅ Comprehensive Documentation

**Why:** Single developer maintainability, easy onboarding, AI-friendly.

**Implementation:**
- Architecture docs
- API reference
- Deployment checklist
- Troubleshooting guide
- Code examples

---

## Scale Assumptions

These decisions are based on the following assumptions about scale:

| Metric | Current Reality | When to Reconsider |
|--------|----------------|-------------------|
| Shops | 1 | 10+ shops |
| Concurrent Users | ~30 | 1,000+ |
| Daily Tickets | 100-200 | 10,000+ |
| Barbers | 5 | 50+ across multiple shops |
| Database | SQLite | Postgres at multi-tenant |
| Requests/sec | <5 | 100+ sustained |
| Infrastructure | Single Node process | Multi-region deployment |

## Migration Path

If the business grows beyond single-shop deployment:

### Phase 1: Multi-Shop (10-50 shops)
- Keep architecture the same
- Deploy separate instance per shop
- Consider Postgres per instance
- Shared monitoring/alerting

### Phase 2: Multi-Tenant SaaS (50+ shops)
- **Now** consider TanStack Query (cache per tenant)
- **Now** consider OpenTelemetry (distributed tracing)
- Postgres with tenant_id column
- Centralized authentication
- Shared infrastructure

### Phase 3: Scale (100+ shops, 1000+ concurrent users)
- Load balancing
- Database replication
- Redis for caching
- Message queue for async operations
- Full observability stack

## Conclusion

**Right-sizing matters.** Enterprise patterns don't make sense for small deployments. This system is optimized for:

- Single barbershop deployment
- 5 barbers, 30 concurrent users
- Simple maintenance (one developer)
- Low operational overhead
- Quick debugging without complex tooling

When the business grows, we have a clear migration path. Until then, we keep it simple.

---

*Last updated: 2024*

