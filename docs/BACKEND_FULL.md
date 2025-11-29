# Backend Reference

Complete backend documentation for EuToNaFila queue management system.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Fastify |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Validation | Zod |
| Language | TypeScript |

## Project Structure

```
apps/api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Database connection
│   │   └── schema.ts         # Drizzle schema definitions
│   ├── routes/
│   │   ├── queue.ts          # Queue endpoints
│   │   ├── tickets.ts        # Ticket endpoints
│   │   ├── barbers.ts        # Barber endpoints
│   │   └── status.ts         # Status update endpoint
│   ├── services/
│   │   ├── TicketService.ts  # Ticket business logic
│   │   └── QueueService.ts   # Queue calculations
│   ├── middleware/
│   │   ├── errorHandler.ts   # Error handling
│   │   ├── validator.ts      # Request validation
│   │   └── auth.ts           # Authentication
│   ├── lib/
│   │   ├── errors.ts         # Custom error classes
│   │   └── validation.ts     # Validation helpers
│   ├── env.ts                # Environment config
│   ├── server.ts             # Entry point
│   ├── migrate.ts            # Migration runner
│   └── seed.ts               # Database seeder
├── drizzle/                   # Generated migrations
└── drizzle.config.ts         # Drizzle configuration
```

---

## Database Schema

### Tables

#### shops

Store configuration for each barbershop.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| slug | TEXT | URL identifier (unique) |
| name | TEXT | Display name |
| domain | TEXT | Custom domain |
| path | TEXT | URL path |
| api_base | TEXT | API base URL |
| theme | TEXT | JSON string `{ primary, accent }` |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### services

Available services offered by the shop.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shop_id | INTEGER | Foreign key to shops |
| name | TEXT | Service name |
| description | TEXT | Service description |
| duration | INTEGER | Duration in minutes |
| price | INTEGER | Price in cents |
| is_active | BOOLEAN | Active status (default true) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### barbers

Staff members who serve customers.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shop_id | INTEGER | Foreign key to shops |
| name | TEXT | Barber name |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| avatar_url | TEXT | Profile photo URL |
| is_active | BOOLEAN | Account active status (default true) |
| is_present | BOOLEAN | Currently at work (default true) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Note:** `is_active` indicates the barber account exists and can be used. `is_present` indicates the barber is currently at the shop and available for assignment. When `is_present` is set to false, any customers assigned to that barber with status `in_progress` are automatically unassigned and returned to `waiting` status.

#### tickets

Queue entries representing customer visits.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| shop_id | INTEGER | Foreign key to shops |
| service_id | INTEGER | Foreign key to services |
| barber_id | INTEGER | Foreign key to barbers (nullable) |
| customer_name | TEXT | Customer name |
| customer_phone | TEXT | Phone (optional) |
| status | TEXT | waiting, in_progress, completed, cancelled |
| position | INTEGER | Queue position (default 0) |
| estimated_wait_time | INTEGER | Wait time in minutes |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### Relationships

```
shops
  ├── services (one-to-many)
  ├── barbers (one-to-many)
  └── tickets (one-to-many)

services
  └── tickets (one-to-many)

barbers
  └── tickets (one-to-many)

tickets
  ├── shop (many-to-one)
  ├── service (many-to-one)
  └── barber (many-to-one, optional)
```

### Ticket Status Values

| Status | Description |
|--------|-------------|
| `waiting` | Customer in queue |
| `in_progress` | Being served |
| `completed` | Service finished |
| `cancelled` | Removed from queue |

### Valid Status Transitions

```
waiting → in_progress
waiting → cancelled
in_progress → completed
in_progress → cancelled
```

---

## API Endpoints

### Health Check

#### GET /health

Check server status.

**Response**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "checks": {
    "database": "ok"
  },
  "memory": {
    "rss": 50,
    "heapUsed": 30,
    "heapTotal": 40
  }
}
```

---

### Queue Endpoints

#### GET /api/shops/:slug/queue

Get current queue for a shop.

**Parameters**
- `slug` (path) - Shop identifier

**Response**

```json
{
  "shop": {
    "id": 1,
    "slug": "mineiro",
    "name": "Barbearia Mineiro",
    "theme": { "primary": "#8B4513", "accent": "#D2691E" }
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

**Errors**
- `404` - Shop not found

---

#### GET /api/shops/:slug/metrics

Get queue metrics for a shop.

**Parameters**
- `slug` (path) - Shop identifier

**Response**

```json
{
  "queueLength": 5,
  "averageWaitTime": 35,
  "activeBarbers": 2,
  "ticketsInProgress": 2
}
```

---

#### GET /api/shops/:slug/statistics

Get ticket statistics for a shop.

**Parameters**
- `slug` (path) - Shop identifier
- `since` (query, optional) - ISO date string

**Response**

```json
{
  "total": 100,
  "waiting": 5,
  "inProgress": 2,
  "completed": 85,
  "cancelled": 8
}
```

---

### Ticket Endpoints

#### POST /api/shops/:slug/tickets

Create a new ticket (join queue).

**Parameters**
- `slug` (path) - Shop identifier

**Request Body**

```json
{
  "customerName": "Pedro Costa",
  "customerPhone": "11988888888",
  "serviceId": 2
}
```

**Validation**
- `customerName` - Required, 2-100 characters
- `customerPhone` - Optional string
- `serviceId` - Optional, service selection handled in-person

**Note:** Profanity filtering for customer names is handled on the frontend before submission.

**Response (201)**

```json
{
  "id": 3,
  "shopId": 1,
  "serviceId": 2,
  "barberId": null,
  "customerName": "Pedro Costa",
  "customerPhone": "11988888888",
  "status": "waiting",
  "position": 2,
  "estimatedWaitTime": 50,
  "createdAt": "2024-01-15T10:20:00.000Z",
  "updatedAt": "2024-01-15T10:20:00.000Z"
}
```

**Errors**
- `400` - Validation failed
- `404` - Shop or service not found
- `409` - Queue is full

---

#### GET /api/tickets/:id

Get ticket by ID.

**Parameters**
- `id` (path) - Ticket ID

**Response**

```json
{
  "id": 2,
  "shopId": 1,
  "serviceId": 1,
  "barberId": null,
  "customerName": "Maria Santos",
  "status": "waiting",
  "position": 1,
  "estimatedWaitTime": 25,
  "createdAt": "2024-01-15T10:10:00.000Z",
  "updatedAt": "2024-01-15T10:10:00.000Z"
}
```

**Errors**
- `404` - Ticket not found

---

#### PATCH /api/tickets/:id

Update a ticket (assign/unassign barber, change status).

**Parameters**
- `id` (path) - Ticket ID

**Request Body**

```json
{
  "barberId": 3,
  "status": "in_progress"
}
```

| Field | Type | Description |
|-------|------|-------------|
| barberId | number \| null | Barber ID to assign, or null to unassign |
| status | string | New status (optional) |

**Response**

Returns updated ticket.

**Errors**
- `404` - Ticket not found

**Use Cases:**
- Assign barber to customer: `{ "barberId": 3, "status": "in_progress" }`
- Unassign barber (return to queue): `{ "barberId": null, "status": "waiting" }`
- Change assigned barber: `{ "barberId": 5 }`

---

#### DELETE /api/tickets/:id

Cancel a ticket.

**Parameters**
- `id` (path) - Ticket ID

**Response**

Returns the cancelled ticket with `status: "cancelled"`.

**Errors**
- `404` - Ticket not found

---

#### PATCH /api/tickets/:id/status (Legacy)

Update ticket status.

**Parameters**
- `id` (path) - Ticket ID

**Request Body**

```json
{
  "status": "in_progress",
  "barberId": 3
}
```

**Validation**
- `status` - Required: waiting, in_progress, completed, cancelled
- `barberId` - Optional, must be valid barber ID

**Response**

Returns updated ticket.

**Errors**
- `400` - Validation failed
- `404` - Ticket or barber not found
- `409` - Invalid status transition

---

### Barber Endpoints

#### GET /api/shops/:slug/barbers

Get all barbers for a shop.

**Parameters**
- `slug` (path) - Shop identifier

**Response**

```json
[
  {
    "id": 1,
    "shopId": 1,
    "name": "João",
    "avatarUrl": "https://example.com/joao.jpg",
    "isActive": true,
    "isPresent": true
  }
]
```

---

#### PATCH /api/barbers/:id/presence

Toggle barber presence status.

**Parameters**
- `id` (path) - Barber ID

**Request Body**

```json
{
  "isPresent": false
}
```

**Response**

Returns updated barber.

**Side Effects:**
When setting `isPresent: false`:
- All tickets assigned to this barber with status `in_progress` are changed to `waiting`
- `barberId` is set to null for those tickets
- Queue positions are recalculated

**Errors**
- `404` - Barber not found

---

## Error Handling

### Error Response Format

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### Validation Error Format

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "errors": [
    { "field": "customerName", "message": "Required" }
  ]
}
```

### Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `BAD_REQUEST` | 400 | General client error |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Permission denied |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Business rule violation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Custom Error Classes

```typescript
import { NotFoundError, ValidationError, ConflictError } from './lib/errors.js';

// Usage in route handlers
throw new NotFoundError('Ticket not found');
throw new ValidationError('Validation failed', [{ field: 'name', message: 'Required' }]);
throw new ConflictError('Queue is full');
```

---

## Service Layer

### TicketService

Handles ticket operations and business logic.

```typescript
import { ticketService } from './services/TicketService.js';

// Get ticket
const ticket = await ticketService.getById(42);

// Get shop tickets
const tickets = await ticketService.getByShop(shopId, 'waiting');

// Create ticket
const ticket = await ticketService.create(shopId, {
  serviceId: 2,
  customerName: 'João Silva',
  customerPhone: '11999999999'
});

// Update status
const ticket = await ticketService.updateStatus(42, {
  status: 'in_progress',
  barberId: 3
});

// Cancel ticket
const ticket = await ticketService.cancel(42);

// Get statistics
const stats = await ticketService.getStatistics(shopId);
```

### QueueService

Handles queue calculations and position management.

```typescript
import { queueService } from './services/QueueService.js';

// Calculate position for new ticket
const position = await queueService.calculatePosition(shopId, new Date());

// Calculate wait time
const waitTime = await queueService.calculateWaitTime(shopId, position);

// Recalculate all positions
await queueService.recalculatePositions(shopId);

// Get metrics
const metrics = await queueService.getMetrics(shopId);

// Check if queue is full
const isFull = await queueService.isQueueFull(shopId, 50);
```

---

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | development | No |
| `PORT` | Server port | 4041 | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CORS_ORIGIN` | Allowed origin | http://localhost:4040 | No |
| `SHOP_SLUG` | Default shop | mineiro | No |

**Example DATABASE_URL:**
```
postgresql://user:password@host:5432/database
```

---

## Code Conventions

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Services | PascalCase | `TicketService.ts` |
| Routes | kebab-case | `tickets.ts` |
| Utilities | camelCase | `validation.ts` |

### Import Order

```typescript
// 1. External packages
import type { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';

// 2. Shared package
import { createTicketSchema } from '@eutonafila/shared';

// 3. Internal imports
import { db, schema } from '../db/index.js';
import { ticketService } from '../services/TicketService.js';
```

### TypeScript

- Use `.js` extension in imports (ESM requirement)
- Avoid `any` type
- Use Zod for runtime validation
- Document public functions with JSDoc

### Database

- Table names: lowercase plural (`shops`, `tickets`)
- Column names: snake_case (`shop_id`, `created_at`)
- Use relations for joins

---

## Database Commands

```bash
# Generate migration from schema changes
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate

# Seed with test data
pnpm db:seed

# Open Drizzle Studio (GUI)
pnpm --filter api db:studio
```

**Note:** On Render deployment, migrations and seeding run automatically on each deploy via the start script:
```bash
pnpm db:migrate && pnpm db:seed && pnpm --filter api start
```

---

## Security

### Rate Limiting

- 100 requests per minute per IP
- Returns 429 when exceeded

### CORS

- Origin restricted to `CORS_ORIGIN` env var
- Credentials enabled

### Headers

Fastify Helmet provides security headers:
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options

---

## Adding New Endpoints

### 1. Define Zod Schema (if needed)

```typescript
// packages/shared/src/schemas/example.ts
export const exampleSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
});
```

### 2. Create Service

```typescript
// apps/api/src/services/ExampleService.ts
export class ExampleService {
  async getById(id: number) {
    return db.query.examples.findFirst({
      where: eq(schema.examples.id, id),
    });
  }
}

export const exampleService = new ExampleService();
```

### 3. Create Route

```typescript
// apps/api/src/routes/examples.ts
export const exampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/examples/:id', async (request, reply) => {
    const { id } = validateRequest(paramsSchema, request.params);
    const example = await exampleService.getById(id);
    if (!example) throw new NotFoundError('Example not found');
    return example;
  });
};
```

### 4. Register Route

```typescript
// apps/api/src/server.ts
import { exampleRoutes } from './routes/examples.js';

fastify.register(async (instance) => {
  instance.register(exampleRoutes);
}, { prefix: '/api' });
```
