# Backend Reference

API documentation for EuToNaFila queue management system.

## Status: ✅ Complete

All core backend functionality is implemented and operational.

## Tech Stack

- Runtime: Node.js 20+
- Framework: Fastify
- ORM: Drizzle ORM
- Database: PostgreSQL 16
- Validation: Zod
- Auth: JWT (HS256, 24h expiry)

## Database Schema

### projects
- `id` SERIAL PRIMARY KEY
- `slug` TEXT UNIQUE - Project identifier (e.g. "mineiro")
- `name` TEXT, `path` TEXT - Display name and URL path
- `created_at`, `updated_at` TIMESTAMP

### shops
- `id` SERIAL PRIMARY KEY
- `project_id` INTEGER NOT NULL FK → projects - Shop belongs to a project
- `company_id` INTEGER FK → companies (optional)
- `slug` TEXT - URL identifier (unique per project)
- `name` TEXT - Shop name
- `owner_pin` TEXT - Owner PIN (full access)
- `staff_pin` TEXT - Staff PIN (queue management only)
- `created_at`, `updated_at` TIMESTAMP

### services
- `id` SERIAL PRIMARY KEY
- `shop_id` INTEGER FK → shops
- `name` TEXT - Service name (1-200 chars)
- `description` TEXT - Service description (max 500 chars, nullable)
- `duration` INTEGER - Duration in minutes (required, positive)
- `price` INTEGER - Price in cents (nullable)
- `is_active` BOOLEAN - Active status (default true)
- `created_at`, `updated_at` TIMESTAMP

### barbers
- `id` SERIAL PRIMARY KEY
- `shop_id` INTEGER FK → shops
- `name` TEXT - Barber name (1-100 chars)
- `email` TEXT - Email (nullable)
- `phone` TEXT - Phone (nullable)
- `avatar_url` TEXT - Profile photo URL (nullable)
- `is_active` BOOLEAN - Account active (default true)
- `is_present` BOOLEAN - Currently at work (default true)
- `created_at`, `updated_at` TIMESTAMP

### tickets
- `id` SERIAL PRIMARY KEY
- `shop_id` INTEGER FK → shops
- `service_id` INTEGER FK → services
- `barber_id` INTEGER FK → barbers (nullable)
- `customer_name` TEXT - Customer full name (1-200 chars)
- `customer_phone` TEXT - Phone (nullable)
- `status` TEXT - waiting | in_progress | completed | cancelled
- `position` INTEGER - Queue position (default 0)
- `estimated_wait_time` INTEGER - Wait time in minutes
- `created_at`, `updated_at` TIMESTAMP

### Relationships
```
shops → services (1:many)
shops → barbers (1:many)
shops → tickets (1:many)
services → tickets (1:many)
barbers → tickets (1:many, optional)
```

### Status Transitions
```
waiting → in_progress (when barber assigned)
waiting → cancelled (customer leaves or staff removes)
in_progress → completed (service finished)
in_progress → cancelled (customer leaves)
```

## Authentication

### PIN-based JWT Auth

**Login:** `POST /api/shops/:slug/auth`

```json
Request: { "pin": "1234" }
Response: { "valid": true, "role": "owner", "token": "eyJ..." }
```

**Roles:**
- `owner` - Full access (analytics, barber/service CRUD)
- `staff` - Queue management only (tickets, presence)

**Token Usage:**
```
Authorization: Bearer <token>
```

**Token Details:**
- Algorithm: HS256 (HMAC SHA-256)
- Expiry: 24 hours
- Issuer: `eutonafila-api`
- Audience: `eutonafila-client`
- Payload: `userId` (shopId), `shopId`, `role`

**Security:**
- Tokens are stateless (no server-side storage)
- Must be included in Authorization header for protected endpoints
- 401 Unauthorized returned if missing/invalid/expired

### Customer Auth (Sign in with Google)

**Initiate:** `GET /api/shops/:slug/auth/customer/google?redirect_uri=/optional/path`
- Redirects user to Google OAuth. After auth, Google redirects to `/api/auth/customer/google/callback` (root callback, shop slug in state).

**Callback:** `GET /api/auth/customer/google/callback?code=...&state=...`
- Exchanges code for tokens, finds/creates client, issues JWT with `role: customer`, redirects to frontend callback.

**Env:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_API_URL`. Add redirect URI in Google Console: `{PUBLIC_API_URL}/api/auth/customer/google/callback`. See RENDER_DEPLOY.md for troubleshooting.

## API Endpoints

### Public Endpoints (No Auth Required)

#### GET /health
Health check with database status
```json
{ 
  "status": "ok", 
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": { "database": "ok" },
  "memory": { "rss": 50, "heapUsed": 30, "heapTotal": 40 }
}
```

#### GET /api/shops/:slug/queue
Get current queue with tickets
```json
{
  "shop": { 
    "id": 1, 
    "slug": "mineiro", 
    "name": "Barbearia Mineiro",
    "theme": { "primary": "#D4AF37", "accent": "#FFD54F" }
  },
  "tickets": [
    {
      "id": 1,
      "shopId": 1,
      "serviceId": 2,
      "barberId": 3,
      "customerName": "João Silva",
      "customerPhone": "11999999999",
      "status": "in_progress",
      "position": 0,
      "estimatedWaitTime": null,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:15:00.000Z"
    }
  ]
}
```

#### GET /api/shops/:slug/metrics
Real-time queue metrics
```json
{
  "queueLength": 5,
  "averageWaitTime": 35,
  "activeBarbers": 2,
  "ticketsInProgress": 2
}
```

#### GET /api/shops/:slug/statistics
Ticket statistics (optional `?since=ISO_DATE`)
```json
{
  "total": 100,
  "waiting": 5,
  "inProgress": 2,
  "completed": 85,
  "cancelled": 8
}
```

#### POST /api/shops/:slug/tickets
Join queue (duplicate check: returns existing if customer already in queue)
```json
Request: {
  "customerName": "João Silva",
  "customerPhone": "11999999999", // optional
  "serviceId": 1 // required
}

Response (201 - new): { "id": 3, "status": "waiting", "position": 2, ... }
Response (200 - existing): { "id": 2, "status": "waiting", "position": 1, ... }
```

**Duplicate Check:** Searches for active tickets (status=waiting or in_progress) with matching customerName + shopId. Returns existing ticket with 200 if found.

#### GET /api/tickets/:id
Get ticket by ID (includes position and wait time)

#### GET /api/shops/:slug/barbers
List all barbers for shop
```json
[
  {
    "id": 1,
    "shopId": 1,
    "name": "João",
    "email": null,
    "phone": null,
    "avatarUrl": "https://...",
    "isActive": true,
    "isPresent": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### GET /api/shops/:slug/services
List all services for shop
```json
[
  {
    "id": 1,
    "shopId": 1,
    "name": "Corte de Cabelo",
    "description": "Corte tradicional",
    "duration": 30,
    "price": 3000,
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### Staff Endpoints (Requires Auth: staff or owner)

#### PATCH /api/tickets/:id
Update ticket (assign/unassign barber, change status)
```json
Request: { "barberId": 3, "status": "in_progress" }
Response: Updated ticket
```

#### PATCH /api/tickets/:id/status
Update ticket status (alternative endpoint, more explicit)
```json
Request: { "status": "in_progress", "barberId": 3 }
Response: Updated ticket
```

#### DELETE /api/tickets/:id
Cancel ticket (status → cancelled)
```json
Response: Cancelled ticket with status="cancelled"
```

#### PATCH /api/barbers/:id/presence
Toggle barber presence
```json
Request: { "isPresent": false }
Response: Updated barber
```

**Side Effect:** When `isPresent: false`, all tickets with this barber and status=in_progress are updated to barberId=null, status=waiting.

---

### Owner Endpoints (Requires Auth: owner only)

#### GET /api/shops/:slug/analytics
Analytics data (optional `?days=30`, default 7, max 90)
```json
{
  "period": { "days": 30, "startDate": "...", "endDate": "..." },
  "summary": { 
    "total": 150, 
    "completed": 140, 
    "cancelled": 10,
    "completionRate": 0.93,
    "averagePerDay": 5.0,
    "averageServiceTime": 35
  },
  "ticketsByDay": { "2024-01-15": 12, "2024-01-16": 8, ... },
  "hourlyDistribution": { "9": 5, "10": 8, "11": 12, ... },
  "peakHour": { "hour": 14, "count": 15 },
  "barberPerformance": [
    { "barberId": 1, "name": "João", "ticketsCompleted": 45, "averageTime": 32 }
  ]
}
```

#### POST /api/shops/:slug/barbers
Create barber
```json
Request: { 
  "name": "João", 
  "avatarUrl": "https://..." // optional
}
Response (201): Created barber (isPresent defaults to false)
```

#### PATCH /api/barbers/:id
Update barber details (name, avatarUrl only; use /presence for isPresent)
```json
Request: { "name": "João Silva", "avatarUrl": "https://..." }
Response: Updated barber
```

#### DELETE /api/barbers/:id
Delete barber
```json
Response: { "success": true, "message": "Barber deleted successfully" }
```

**Side Effect:** All tickets with this barberId are updated to barberId=null, status=waiting.

#### POST /api/shops/:slug/services
Create service
```json
Request: {
  "name": "Corte + Barba",
  "description": "Combo completo", // optional
  "duration": 45, // required, positive int
  "price": 4500, // optional, positive int (cents)
  "isActive": true // optional, default true
}
Response (201): Created service
```

#### PATCH /api/services/:id
Update service (all fields optional)
```json
Request: { 
  "name": "Corte Premium", 
  "price": 5000, 
  "isActive": false 
}
Response: Updated service
```

#### DELETE /api/services/:id
Delete service
```json
Response: { "success": true, "message": "Service deleted successfully" }
```

**Constraint:** Cannot delete if service is in use by active tickets (status=waiting or in_progress). Returns 409 Conflict.

---

## Service Layer

### TicketService (`apps/api/src/services/TicketService.ts`)

```typescript
// Get ticket by ID
ticketService.getById(id: number): Promise<Ticket | null>

// Get tickets for shop (optional status filter)
ticketService.getByShop(shopId: number, status?: string): Promise<Ticket[]>

// Find active ticket by customer name (for duplicate check)
ticketService.findActiveTicketByCustomer(shopId: number, customerName: string): Promise<Ticket | null>

// Create ticket (includes position and wait time calculation)
ticketService.create(shopId: number, data: CreateTicket): Promise<Ticket>

// Update ticket status (validates transitions)
ticketService.updateStatus(id: number, data: UpdateTicketStatus): Promise<Ticket>

// Cancel ticket
ticketService.cancel(id: number): Promise<Ticket>

// Get statistics
ticketService.getStatistics(shopId: number, since?: Date): Promise<Statistics>
```

### QueueService (`apps/api/src/services/QueueService.ts`)

```typescript
// Calculate position for new ticket
queueService.calculatePosition(shopId: number, createdAt: Date): Promise<number>

// Calculate estimated wait time
queueService.calculateWaitTime(shopId: number, position: number): Promise<number>

// Recalculate all positions for shop
queueService.recalculatePositions(shopId: number): Promise<void>

// Get queue metrics
queueService.getMetrics(shopId: number): Promise<Metrics>

// Check if queue is full
queueService.isQueueFull(shopId: number, maxSize: number): Promise<boolean>
```

## Error Handling

### Error Response Format
```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "errors": [{ "field": "name", "message": "Required" }] // validation only
}
```

### Error Codes
- `VALIDATION_ERROR` (400) - Input validation failed
- `BAD_REQUEST` (400) - General client error
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Permission denied
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Business rule violation (queue full, service in use, invalid transition)
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error

### Custom Error Classes
```typescript
import { NotFoundError, ValidationError, ConflictError } from './lib/errors.js';

throw new NotFoundError('Ticket not found');
throw new ValidationError('Validation failed', [{ field: 'name', message: 'Required' }]);
throw new ConflictError('Cannot delete service in use');
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | development | No |
| `PORT` | Server port | 4041 | No |
| `DATABASE_URL` | PostgreSQL connection | postgresql://localhost:5432/eutonafila | Yes (prod) |
| `JWT_SECRET` | JWT signing secret (32+ chars) | change_me_in_production... | Yes (prod) |
| `CORS_ORIGIN` | Allowed origin (frontend URL) | http://localhost:4040 | Yes (prod) |
| `SHOP_SLUG` | Default shop | mineiro | No |
| `PUBLIC_API_URL` | Canonical API URL for OAuth (no trailing slash) | - | Yes if using Google OAuth |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | - | Optional (Sign in with Google + Gmail) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | - | Optional |

**Example `DATABASE_URL`:**
```
postgresql://username:password@host:5432/database
```

## Database Commands

```bash
# Generate migration from schema changes
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate

# Seed test data (creates shop, services, barbers)
pnpm db:seed

# Open Drizzle Studio (GUI)
pnpm --filter api db:studio
```

**Production:** Migrations and seeding run automatically on deploy via:
```bash
pnpm db:migrate && pnpm db:seed && pnpm --filter api start
```

## Security

- **Rate Limiting:** 100 req/min per IP (429 on exceed)
- **CORS:** Origin restricted to `CORS_ORIGIN` env var
- **Helmet:** Security headers (CSP, X-Frame-Options, etc.)
- **JWT:** Stateless tokens, 24h expiry, HS256 algorithm

## Code Conventions

### File Naming
- Services: PascalCase (`TicketService.ts`)
- Routes: kebab-case (`tickets.ts`, `barber.ts`)
- Utilities: camelCase (`validation.ts`)

### Import Order
1. External packages (`fastify`, `drizzle-orm`, `zod`)
2. Shared package (`@eutonafila/shared`)
3. Internal imports (`../db/index.js`, `../lib/errors.js`)

### Database
- Tables: lowercase plural (`shops`, `tickets`, `barbers`)
- Columns: snake_case (`shop_id`, `created_at`, `is_active`)
- Use Drizzle relations for joins
- Always update `updated_at` on changes

### TypeScript
- Use `.js` extension in imports (ESM requirement)
- Avoid `any` type
- Zod for runtime validation
- JSDoc for public functions

## Adding New Endpoints

1. **Define Zod schema** in `packages/shared/src/schemas/` (if needed)
2. **Create service** in `apps/api/src/services/` (business logic)
3. **Create route** in `apps/api/src/routes/` (HTTP handlers)
4. **Register route** in `apps/api/src/server.ts`

**Example route:**
```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

export const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/examples/:id', async (request, reply) => {
    const { id } = validateRequest(
      z.object({ id: z.coerce.number() }), 
      request.params
    );
    
    const example = await exampleService.getById(id);
    if (!example) throw new NotFoundError('Example not found');
    
    return example;
  });
};
```

## Project Structure

```
apps/api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection + exports
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── routes/               # API endpoints (one file per resource)
│   │   ├── queue.ts          # Queue endpoints
│   │   ├── tickets.ts        # Ticket CRUD
│   │   ├── barbers.ts        # Barber CRUD + presence
│   │   ├── services.ts       # Service CRUD
│   │   ├── auth.ts           # PIN authentication
│   │   ├── analytics.ts      # Analytics (owner only)
│   │   └── status.ts         # Health check
│   ├── services/             # Business logic layer
│   │   ├── TicketService.ts  # Ticket operations
│   │   └── QueueService.ts   # Queue calculations
│   ├── middleware/           # Request middleware
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts  # Error handling
│   │   └── validator.ts      # Request validation
│   ├── lib/                  # Shared utilities
│   │   ├── errors.ts         # Custom error classes
│   │   ├── jwt.ts            # JWT utilities
│   │   └── validation.ts     # Validation helpers
│   ├── env.ts                # Environment config
│   ├── server.ts             # Fastify server setup + entry point
│   ├── migrate.ts            # Migration runner
│   └── seed.ts               # Database seeder
└── drizzle/                  # Generated migrations
    ├── meta/                 # Migration metadata
    └── *.sql                 # SQL migration files
```
