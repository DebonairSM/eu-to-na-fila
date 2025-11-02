# Architecture Overview

## System Design

EuToNaFila is a single-tenant queue management system with three main components:

1. **Backend API** (Node.js + Fastify) - Handles REST API, WebSocket connections, and serves the web app
2. **Web App** (React + Vite) - Customer and staff interface
3. **Android App** (Kotlin) - Tablet interface for barbers

## Technology Stack

### Backend (`apps/api`)
- **Runtime**: Node.js 20+
- **Framework**: Fastify (chosen for performance and WebSocket support)
- **Database**: libSQL (SQLite) via Drizzle ORM
- **Validation**: Zod schemas from `@eutonafila/shared`
- **Security**: helmet, CORS, rate limiting

### Frontend (`apps/web`)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: React hooks + WebSocket for real-time updates

### Shared (`packages/shared`)
- **Validation**: Zod schemas
- **Types**: TypeScript interfaces and types
- **Protocol**: WebSocket event definitions

## Data Flow

### Customer Joins Queue
```
1. Customer → POST /api/shops/:slug/tickets (name, service)
2. API validates request using Zod schema
3. TicketService creates ticket in database
4. QueueService calculates position and wait time
5. WebSocketService broadcasts ticket.created event
6. API returns ticket with position
7. Customer redirected to /status/:id page
8. WebSocket updates all connected clients
```

### Barber Updates Ticket Status
```
1. Barber → PATCH /api/tickets/:id/status (status, barberId)
2. API validates request and checks authorization
3. TicketService updates ticket status
4. QueueService recalculates positions for waiting tickets
5. WebSocketService broadcasts ticket.status.changed event
6. API returns updated ticket
7. All clients receive real-time update via WebSocket
```

### Real-Time Updates
```
1. Client connects to ws://host/ws?shopId=slug
2. Server sends connection.established event
3. Server broadcasts events when data changes:
   - ticket.created
   - ticket.status.changed
   - metrics.updated
4. Clients update UI automatically
5. Auto-reconnect on disconnect (3-second delay)
```

## Database Schema

### Tables
- `shops` - Barbershop configuration (slug, name, domain, theme)
- `services` - Available services (name, duration, price)
- `barbers` - Staff members (name, email, phone)
- `tickets` - Queue entries (customer info, service, status, position)

### Relationships
- Shop has many Services, Barbers, and Tickets
- Service has many Tickets
- Barber has many Tickets (when assigned)
- Ticket belongs to Shop, Service, and optionally Barber

### Key Fields
- `tickets.status`: `waiting | in_progress | completed | cancelled`
- `tickets.position`: Integer representing queue position (0 = not in queue)
- `tickets.estimatedWaitTime`: Minutes until service (calculated)

## Directory Structure

```
apps/api/src/
├── db/
│   ├── index.ts          # Database connection
│   └── schema.ts         # Drizzle ORM schema definitions
├── services/             # Business logic layer
│   ├── TicketService.ts
│   ├── QueueService.ts
│   └── WebSocketService.ts
├── routes/               # HTTP endpoints
│   ├── queue.ts
│   ├── tickets.ts
│   └── status.ts
├── websocket/
│   └── handler.ts        # WebSocket connection handler
├── middleware/           # Reusable middleware
│   ├── errorHandler.ts
│   ├── validator.ts
│   └── auth.ts
├── lib/                  # Utilities
│   ├── validation.ts
│   └── errors.ts
├── env.ts               # Environment configuration
└── server.ts            # Application entry point

apps/web/src/
├── pages/               # Route components
│   ├── QueuePage.tsx    # Main queue display
│   ├── JoinPage.tsx     # Customer registration
│   └── StatusPage.tsx   # Individual ticket status
├── components/
│   └── ui/              # shadcn/ui components
├── hooks/
│   └── useWebSocket.ts  # WebSocket connection hook
├── lib/
│   ├── api.ts           # Type-safe API client
│   ├── config.ts        # App configuration
│   └── utils.ts         # Utilities
└── App.tsx              # Router setup

packages/shared/src/
├── schemas/             # Zod validation schemas
│   ├── shop.ts
│   ├── service.ts
│   ├── barber.ts
│   └── ticket.ts
└── types/               # TypeScript types
    ├── api.ts           # API request/response types
    ├── errors.ts        # Error response types
    └── websocket.ts     # WebSocket event types
```

## Deployment Model

### Single-Tenant Architecture
- Each barbershop gets its own deployment
- Domain points to dedicated instance (e.g., mineiro.eutonafila.com)
- SQLite database stored on persistent disk
- No multi-tenancy complexity

### Hosting Options
1. **Render** - Deploy as Web Service with Persistent Disk
2. **Railway** - Deploy with Volume for database
3. **Any Node.js host** - Docker container with volume mount

### Migration Path
When scaling needs increase:
- Replace `@libsql/client` with `postgres`
- Update Drizzle connection in `db/index.ts`
- No other code changes required (Drizzle ORM abstracts database)

## Performance Considerations

### Database
- SQLite is sufficient for single shop (< 1000 tickets/day)
- Indexed on `shopId`, `status`, `createdAt`
- Auto-vacuum enabled

### WebSocket
- Single process handles all connections for one shop
- Broadcast to all clients on state change
- Auto-reconnect on client disconnect

### Caching
- Not currently implemented (not needed for single tenant)
- Can add Redis for multi-shop deployments

## Security

### API Security
- Rate limiting (100 requests/minute)
- CORS restricted to configured origin
- Helmet.js security headers
- Input validation on all endpoints

### Authentication
- Customer endpoints: No auth (public queue)
- Staff endpoints: JWT token required (future)
- Admin endpoints: JWT with role check (future)

### Data Privacy
- No PII beyond customer name and phone
- Phone optional
- HTTPS required in production

## Error Handling

### Standard Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Error Types
- `ValidationError` (400) - Invalid input
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Business rule violation
- `InternalError` (500) - Server error

## Testing Strategy

### Current State
- No automated tests yet
- Manual testing during development

### Future Implementation
- Unit tests for services (business logic)
- Integration tests for API endpoints
- E2E tests for critical user flows
- WebSocket event testing

## Monitoring

### Logging
- Fastify built-in logger (Pino)
- Info level in development
- Warn level in production
- Structured JSON logs

### Error Tracking
- Sentry for exception monitoring
- Email alerts on errors
- Stack traces and breadcrumbs
- Free tier sufficient for single shop

### Uptime Monitoring
- UptimeRobot pings `/health` endpoint
- 5-minute check interval
- Email/SMS alerts on downtime
- Simple status page

### Backups
- Automated daily SQLite backups
- Compressed and uploaded to cloud storage
- 30-day retention
- Documented restore procedure

## Architecture Decisions

### Right-Sizing for Single Shop

This system is deliberately kept simple for its target scale: one barbershop with 5 barbers serving ~30 concurrent users. See [SCALE_DECISIONS.md](./SCALE_DECISIONS.md) for detailed rationale.

**What We're NOT Using:**

- ❌ **TanStack Query** - useState + WebSocket is sufficient for this scale
- ❌ **OpenTelemetry** - Pino logs + Sentry errors + uptime monitoring covers our needs
- ❌ **Native Android App** - PWA on tablets provides equivalent UX with less maintenance

**Why:** At this scale, enterprise patterns add complexity without benefit. We optimize for:
- Simple maintenance (single developer)
- Low operational overhead  
- Fast debugging without specialized tools
- Clear migration path when scale increases

**When to Reconsider:** Multi-shop deployment (10+ shops), 1000+ concurrent users, or distributed architecture.

See [SCALE_DECISIONS.md](./SCALE_DECISIONS.md) for complete analysis.

