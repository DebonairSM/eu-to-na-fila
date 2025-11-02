# Code Conventions

## File Naming

### TypeScript Files
- **Components**: PascalCase (e.g., `QueuePage.tsx`, `TicketCard.tsx`)
- **Services**: PascalCase (e.g., `TicketService.ts`, `QueueService.ts`)
- **Utilities**: camelCase (e.g., `validation.ts`, `errors.ts`)
- **Routes**: kebab-case or lowercase (e.g., `tickets.ts`, `queue.ts`)
- **Hooks**: camelCase starting with `use` (e.g., `useWebSocket.ts`)

### Directories
- Lowercase with hyphens (e.g., `apps/api`, `packages/shared`)
- Exception: React component directories can be PascalCase if preferred

## Code Organization

### Import Order
```typescript
// 1. External dependencies
import { FastifyPluginAsync } from 'fastify';
import { eq } from 'drizzle-orm';

// 2. Shared package imports
import { ticketSchema, type Ticket } from '@eutonafila/shared';

// 3. Internal imports (absolute paths)
import { db, schema } from '../db/index.js';
import { TicketService } from '../services/TicketService.js';

// 4. Types (if not imported above)
import type { CreateTicketRequest } from '../types.js';
```

### File Extensions
- Use `.js` in import statements even for TypeScript files
- Actual files use `.ts` or `.tsx`
- This is required for ESM compatibility

## Naming Conventions

### Variables and Functions
```typescript
// camelCase for variables and functions
const ticketCount = 10;
function calculateWaitTime(tickets: Ticket[]): number { }

// SCREAMING_SNAKE_CASE for constants
const MAX_QUEUE_SIZE = 100;
const DEFAULT_WAIT_TIME = 15;
```

### Types and Interfaces
```typescript
// PascalCase for types and interfaces
interface TicketResponse {
  id: number;
  position: number;
}

type TicketStatus = 'waiting' | 'in_progress' | 'completed';

// Suffix with descriptive name
type CreateTicketRequest = { ... };
type UpdateTicketStatusRequest = { ... };
```

### Classes
```typescript
// PascalCase with descriptive names
class TicketService { }
class ValidationError extends Error { }
```

### Database Tables
```typescript
// Lowercase plural for table names
export const shops = sqliteTable('shops', { ... });
export const tickets = sqliteTable('tickets', { ... });

// snake_case for column names
{
  shopId: integer('shop_id'),
  customerName: text('customer_name'),
  createdAt: text('created_at')
}
```

## TypeScript Guidelines

### Strict Type Safety
```typescript
// ✅ Good: Explicit types
function getTicket(id: number): Promise<Ticket | null> {
  return db.query.tickets.findFirst({ where: eq(schema.tickets.id, id) });
}

// ❌ Bad: Using any
function getTicket(id: any): Promise<any> { }

// ✅ Good: Type guards
function isTicket(value: unknown): value is Ticket {
  return ticketSchema.safeParse(value).success;
}
```

### Optional vs Undefined
```typescript
// ✅ Use optional for object properties
interface Ticket {
  barberId?: number;  // May or may not be present
  phone?: string;
}

// ✅ Use undefined in unions for function returns
function findTicket(id: number): Ticket | undefined { }
```

### Avoid Type Assertions
```typescript
// ❌ Bad: Type assertion
const params = request.params as { slug: string };

// ✅ Good: Type guard or validation
const paramsSchema = z.object({ slug: z.string() });
const params = paramsSchema.parse(request.params);
```

## Documentation

### JSDoc Comments
```typescript
/**
 * Creates a new ticket in the queue.
 * 
 * @param shopId - The shop's database ID
 * @param data - Customer and service information
 * @returns The created ticket with position and wait time
 * @throws {ValidationError} If input data is invalid
 * @throws {NotFoundError} If shop or service doesn't exist
 * 
 * @example
 * ```typescript
 * const ticket = await createTicket(1, {
 *   serviceId: 2,
 *   customerName: 'João Silva',
 *   customerPhone: '11999999999'
 * });
 * ```
 */
async function createTicket(
  shopId: number,
  data: CreateTicket
): Promise<Ticket> {
  // Implementation
}
```

### Inline Comments
```typescript
// Use comments for complex business logic
// Calculate position based on active tickets created before this one
const position = waitingTickets.filter(t => 
  t.createdAt < ticket.createdAt
).length + 1;

// Avoid obvious comments
// ❌ Bad
// Increment counter
counter++;

// ✅ Good (only comment non-obvious logic)
// Use ceil to ensure we always round up wait times
const estimatedMinutes = Math.ceil(duration / 60);
```

## Error Handling

### API Routes
```typescript
// Pattern for route handlers
fastify.get('/api/tickets/:id', async (request, reply) => {
  try {
    // 1. Validate input
    const { id } = paramsSchema.parse(request.params);
    
    // 2. Business logic
    const ticket = await ticketService.getById(id);
    
    if (!ticket) {
      return reply.status(404).send({
        error: 'Ticket not found',
        code: 'TICKET_NOT_FOUND'
      });
    }
    
    // 3. Return response
    return ticket;
  } catch (error) {
    // Let error handler middleware handle it
    throw error;
  }
});
```

### Service Layer
```typescript
// Services throw typed errors
class TicketService {
  async getById(id: number): Promise<Ticket> {
    const ticket = await db.query.tickets.findFirst({
      where: eq(schema.tickets.id, id)
    });
    
    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }
    
    return ticket;
  }
}
```

## Async/Await

### Always Use Async/Await
```typescript
// ✅ Good
async function getTickets(): Promise<Ticket[]> {
  const tickets = await db.query.tickets.findMany();
  return tickets;
}

// ❌ Bad: Don't use .then()
function getTickets(): Promise<Ticket[]> {
  return db.query.tickets.findMany().then(tickets => tickets);
}
```

### Error Handling
```typescript
// ✅ Good: Let errors bubble up in services
async function createTicket(data: CreateTicket): Promise<Ticket> {
  const ticket = await db.insert(schema.tickets).values(data);
  return ticket;
}

// ✅ Good: Catch at boundary (routes, hooks)
fastify.post('/tickets', async (request, reply) => {
  try {
    const ticket = await createTicket(request.body);
    return ticket;
  } catch (error) {
    handleError(error, reply);
  }
});
```

## React Conventions

### Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// 2. Types/Interfaces
interface QueuePageProps {
  shopSlug: string;
}

// 3. Component
export function QueuePage({ shopSlug }: QueuePageProps) {
  // 3a. Hooks
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const { isConnected } = useWebSocket(shopSlug);
  
  // 3b. Effects
  useEffect(() => {
    loadTickets();
  }, [shopSlug]);
  
  // 3c. Event handlers
  const handleRefresh = () => {
    loadTickets();
  };
  
  // 3d. Helper functions
  async function loadTickets() {
    const data = await api.getQueue(shopSlug);
    setTickets(data.tickets);
  }
  
  // 3e. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Hooks
```typescript
// Custom hooks start with 'use'
export function useWebSocket(shopId: string) {
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, [shopId]);
  
  return { isConnected };
}
```

## Git Commit Messages

### Format
```
type(scope): brief description

Detailed explanation (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `style`: Formatting changes
- `test`: Adding tests
- `chore`: Build/tooling changes

### Examples
```
feat(api): add ticket status update endpoint

Implements PATCH /api/tickets/:id/status with validation
and WebSocket broadcast.

fix(web): resolve WebSocket reconnection loop

Added shouldConnect flag to prevent multiple simultaneous
reconnection attempts.

docs(architecture): add data flow diagrams
```

## Package Management

### Use pnpm
```bash
# Install dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter api add fastify
pnpm --filter web add react

# Add to shared package
pnpm --filter shared add zod
```

### Version Pinning
- Use exact versions for production dependencies
- Use caret (^) for dev dependencies
- Keep all workspaces in sync for shared deps

## Environment Variables

### Naming
```bash
# SCREAMING_SNAKE_CASE
NODE_ENV=production
DATABASE_URL=sqlite://data/db.sqlite
JWT_SECRET=secret123
```

### Validation
```typescript
// Use Zod to validate env vars
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATA_PATH: z.string(),
});

export const env = envSchema.parse(process.env);
```

## Testing Conventions (Future)

### File Naming
- Test files: `*.test.ts` or `*.spec.ts`
- Located next to source file or in `__tests__` directory

### Structure
```typescript
describe('TicketService', () => {
  describe('createTicket', () => {
    it('should create ticket with correct position', async () => {
      // Arrange
      const data = { ... };
      
      // Act
      const ticket = await ticketService.create(data);
      
      // Assert
      expect(ticket.position).toBe(1);
    });
  });
});
```

