# Common Patterns

This document provides complete examples for common development tasks.

## Table of Contents

1. [Adding a New API Endpoint](#adding-a-new-api-endpoint)
2. [Creating a Database Table](#creating-a-database-table)
3. [Adding a WebSocket Event](#adding-a-websocket-event)
4. [Implementing Business Logic in Services](#implementing-business-logic-in-services)
5. [Validating Input with Zod](#validating-input-with-zod)
6. [Error Handling](#error-handling)
7. [React Data Fetching](#react-data-fetching)
8. [Custom React Hooks](#custom-react-hooks)

---

## Adding a New API Endpoint

### Step 1: Define Zod Schema in Shared Package

**File**: `packages/shared/src/schemas/example.ts`

```typescript
import { z } from 'zod';

// Define the schema for your resource
export const exampleSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  isActive: z.boolean(),
  createdAt: z.date().or(z.string()),
});

export type Example = z.infer<typeof exampleSchema>;

// Define schema for creating (omit id, createdAt, etc.)
export const createExampleSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export type CreateExample = z.infer<typeof createExampleSchema>;

// Define schema for updating
export const updateExampleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateExample = z.infer<typeof updateExampleSchema>;
```

**File**: `packages/shared/src/index.ts`

```typescript
// Add exports
export * from './schemas/example.js';
```

### Step 2: Create Service Class

**File**: `apps/api/src/services/ExampleService.ts`

```typescript
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { CreateExample, UpdateExample, Example } from '@eutonafila/shared';
import { NotFoundError } from '../lib/errors.js';

/**
 * Service for managing examples.
 * Handles business logic for example operations.
 */
export class ExampleService {
  /**
   * Get all examples.
   * 
   * @returns Array of all examples
   */
  async getAll(): Promise<Example[]> {
    const examples = await db.query.examples.findMany({
      where: eq(schema.examples.isActive, true),
    });
    return examples;
  }

  /**
   * Get an example by ID.
   * 
   * @param id - Example ID
   * @returns The example
   * @throws {NotFoundError} If example doesn't exist
   */
  async getById(id: number): Promise<Example> {
    const example = await db.query.examples.findFirst({
      where: eq(schema.examples.id, id),
    });

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    return example;
  }

  /**
   * Create a new example.
   * 
   * @param data - Example data
   * @returns The created example
   */
  async create(data: CreateExample): Promise<Example> {
    const [example] = await db
      .insert(schema.examples)
      .values(data)
      .returning();

    return example;
  }

  /**
   * Update an example.
   * 
   * @param id - Example ID
   * @param data - Updated data
   * @returns The updated example
   * @throws {NotFoundError} If example doesn't exist
   */
  async update(id: number, data: UpdateExample): Promise<Example> {
    const [example] = await db
      .update(schema.examples)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schema.examples.id, id))
      .returning();

    if (!example) {
      throw new NotFoundError('Example not found');
    }

    return example;
  }

  /**
   * Delete an example (soft delete by setting isActive = false).
   * 
   * @param id - Example ID
   * @throws {NotFoundError} If example doesn't exist
   */
  async delete(id: number): Promise<void> {
    const [example] = await db
      .update(schema.examples)
      .set({ isActive: false })
      .where(eq(schema.examples.id, id))
      .returning();

    if (!example) {
      throw new NotFoundError('Example not found');
    }
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
```

### Step 3: Create Route Handler

**File**: `apps/api/src/routes/examples.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createExampleSchema, updateExampleSchema } from '@eutonafila/shared';
import { exampleService } from '../services/ExampleService.js';
import { validateRequest } from '../lib/validation.js';

/**
 * Example routes.
 * 
 * @route GET /api/examples - List all examples
 * @route GET /api/examples/:id - Get example by ID
 * @route POST /api/examples - Create new example
 * @route PATCH /api/examples/:id - Update example
 * @route DELETE /api/examples/:id - Delete example
 */
export const examplesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List all examples
   * 
   * @route GET /api/examples
   * @returns {Example[]} Array of examples
   */
  fastify.get('/', async (request, reply) => {
    const examples = await exampleService.getAll();
    return examples;
  });

  /**
   * Get example by ID
   * 
   * @route GET /api/examples/:id
   * @param {number} id - Example ID
   * @returns {Example} The example
   * @throws {404} If example not found
   */
  fastify.get('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const { id } = validateRequest(paramsSchema, request.params);

    const example = await exampleService.getById(id);
    return example;
  });

  /**
   * Create new example
   * 
   * @route POST /api/examples
   * @body {CreateExample} Example data
   * @returns {Example} Created example
   * @throws {400} If validation fails
   */
  fastify.post('/', async (request, reply) => {
    const data = validateRequest(createExampleSchema, request.body);
    const example = await exampleService.create(data);
    return reply.status(201).send(example);
  });

  /**
   * Update example
   * 
   * @route PATCH /api/examples/:id
   * @param {number} id - Example ID
   * @body {UpdateExample} Updated data
   * @returns {Example} Updated example
   * @throws {400} If validation fails
   * @throws {404} If example not found
   */
  fastify.patch('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const { id } = validateRequest(paramsSchema, request.params);
    const data = validateRequest(updateExampleSchema, request.body);

    const example = await exampleService.update(id, data);
    return example;
  });

  /**
   * Delete example
   * 
   * @route DELETE /api/examples/:id
   * @param {number} id - Example ID
   * @returns {void} No content
   * @throws {404} If example not found
   */
  fastify.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.coerce.number() });
    const { id } = validateRequest(paramsSchema, request.params);

    await exampleService.delete(id);
    return reply.status(204).send();
  });
};
```

### Step 4: Register Route in Server

**File**: `apps/api/src/server.ts`

```typescript
import { examplesRoutes } from './routes/examples.js';

// In the API routes section
fastify.register(
  async (instance) => {
    // Register with /examples prefix
    instance.register(examplesRoutes, { prefix: '/examples' });
    
    // ... other routes
  },
  { prefix: '/api' }
);
```

---

## Creating a Database Table

### Step 1: Define Schema

**File**: `apps/api/src/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Define table
export const examples = sqliteTable('examples', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
  description: text('description'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const examplesRelations = relations(examples, ({ one }) => ({
  shop: one(shops, { 
    fields: [examples.shopId], 
    references: [shops.id] 
  }),
}));

// Add to shops relations
export const shopsRelations = relations(shops, ({ many }) => ({
  // ... existing relations
  examples: many(examples),
}));
```

### Step 2: Generate Migration

```bash
cd apps/api
pnpm db:generate
```

This creates a new migration file in `drizzle/`.

### Step 3: Run Migration

```bash
pnpm db:migrate
```

### Step 4: Update Seed (Optional)

**File**: `apps/api/src/seed.ts`

```typescript
// Add seed data for new table
await db.insert(schema.examples).values([
  {
    shopId: shop.id,
    name: 'Example 1',
    description: 'First example',
  },
  {
    shopId: shop.id,
    name: 'Example 2',
    description: 'Second example',
  },
]);
```

---

## Adding a WebSocket Event

### Step 1: Define Event Type in Shared Package

**File**: `packages/shared/src/types/websocket.ts`

```typescript
// Add to existing event types
export type WebSocketEvent =
  | ConnectionEstablished
  | TicketCreated
  | TicketStatusChanged
  | MetricsUpdated
  | ExampleEvent;  // Add new type

// Define new event interface
export interface ExampleEvent {
  type: 'example.action';
  shopId: string;
  timestamp: string;
  data: {
    exampleId: number;
    message: string;
    // ... other fields
  };
}
```

### Step 2: Create Broadcast Function in WebSocketService

**File**: `apps/api/src/services/WebSocketService.ts`

```typescript
/**
 * Broadcast example event to all connected clients.
 * 
 * @param shopId - Shop identifier
 * @param exampleId - Example ID
 * @param message - Event message
 */
broadcastExampleEvent(
  shopId: string,
  exampleId: number,
  message: string
): void {
  const event: ExampleEvent = {
    type: 'example.action',
    shopId,
    timestamp: new Date().toISOString(),
    data: {
      exampleId,
      message,
    },
  };

  this.broadcast(shopId, event);
}
```

### Step 3: Emit Event from Service

**File**: `apps/api/src/services/ExampleService.ts`

```typescript
import { websocketService } from './WebSocketService.js';

async create(shopId: string, data: CreateExample): Promise<Example> {
  const example = await db.insert(schema.examples).values(data).returning();
  
  // Broadcast WebSocket event
  websocketService.broadcastExampleEvent(
    shopId,
    example.id,
    'Example created'
  );
  
  return example;
}
```

### Step 4: Handle Event in React

**File**: `apps/web/src/pages/ExamplePage.tsx`

```typescript
import { useWebSocket } from '../hooks/useWebSocket';

export function ExamplePage() {
  const { lastEvent } = useWebSocket('mineiro');
  
  useEffect(() => {
    if (!lastEvent) return;
    
    if (lastEvent.type === 'example.action') {
      console.log('Example event:', lastEvent.data);
      // Update UI based on event
    }
  }, [lastEvent]);
  
  return <div>...</div>;
}
```

---

## Implementing Business Logic in Services

### Pattern: Service Class

Services contain business logic and are called by route handlers.

```typescript
/**
 * Service for managing queue operations.
 */
export class QueueService {
  /**
   * Calculate queue position for a new ticket.
   * 
   * @param shopId - Shop ID
   * @param serviceId - Service ID
   * @returns The position in queue (1-based)
   */
  async calculatePosition(
    shopId: number,
    serviceId: number
  ): Promise<number> {
    // Get all waiting tickets for this shop
    const waitingTickets = await db.query.tickets.findMany({
      where: (tickets, { and, eq }) =>
        and(
          eq(tickets.shopId, shopId),
          eq(tickets.status, 'waiting')
        ),
      orderBy: (tickets, { asc }) => [asc(tickets.createdAt)],
    });

    // Position is count + 1
    return waitingTickets.length + 1;
  }

  /**
   * Calculate estimated wait time based on queue.
   * 
   * @param shopId - Shop ID
   * @param position - Position in queue
   * @returns Estimated wait time in minutes
   */
  async calculateWaitTime(
    shopId: number,
    position: number
  ): Promise<number> {
    if (position === 0) return 0;

    // Get average service duration
    const tickets = await db.query.tickets.findMany({
      where: (tickets, { and, eq }) =>
        and(
          eq(tickets.shopId, shopId),
          eq(tickets.status, 'waiting')
        ),
      with: {
        service: true,
      },
    });

    // Calculate average duration
    const totalDuration = tickets.reduce(
      (sum, ticket) => sum + (ticket.service?.duration || 30),
      0
    );
    const avgDuration = tickets.length > 0 
      ? totalDuration / tickets.length 
      : 30;

    // Estimate: position * average duration
    return Math.ceil(position * avgDuration);
  }

  /**
   * Update positions after ticket status change.
   * 
   * @param shopId - Shop ID
   */
  async recalculatePositions(shopId: number): Promise<void> {
    const waitingTickets = await db.query.tickets.findMany({
      where: (tickets, { and, eq }) =>
        and(
          eq(tickets.shopId, shopId),
          eq(tickets.status, 'waiting')
        ),
      orderBy: (tickets, { asc }) => [asc(tickets.createdAt)],
    });

    // Update each ticket's position
    for (let i = 0; i < waitingTickets.length; i++) {
      await db
        .update(schema.tickets)
        .set({ position: i + 1 })
        .where(eq(schema.tickets.id, waitingTickets[i].id));
    }
  }
}

export const queueService = new QueueService();
```

---

## Validating Input with Zod

### Pattern: Validation Helper

**File**: `apps/api/src/lib/validation.ts`

```typescript
import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Validate data against a Zod schema.
 * 
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws {ValidationError} If validation fails
 * 
 * @example
 * ```typescript
 * const schema = z.object({ name: z.string() });
 * const data = validateRequest(schema, request.body);
 * ```
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    throw new ValidationError('Validation failed', errors);
  }

  return result.data;
}

/**
 * Type guard using Zod schema.
 * 
 * @param schema - Zod schema
 * @param data - Data to check
 * @returns True if data matches schema
 */
export function isValidData<T extends z.ZodType>(
  schema: T,
  data: unknown
): data is z.infer<T> {
  return schema.safeParse(data).success;
}
```

### Usage in Routes

```typescript
fastify.post('/tickets', async (request, reply) => {
  // Validate body
  const data = validateRequest(createTicketSchema, request.body);
  
  // Validate params
  const paramsSchema = z.object({ slug: z.string() });
  const { slug } = validateRequest(paramsSchema, request.params);
  
  // Validate query
  const querySchema = z.object({ 
    page: z.coerce.number().optional(),
  });
  const { page } = validateRequest(querySchema, request.query);
  
  // Use validated data
  const ticket = await ticketService.create(data);
  return ticket;
});
```

---

## Error Handling

### Pattern: Custom Error Classes

**File**: `apps/api/src/lib/errors.ts`

```typescript
/**
 * Base application error.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Validation error (400).
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, 'VALIDATION_ERROR');
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

/**
 * Not found error (404).
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error (409).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Unauthorized error (401).
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

### Pattern: Error Handler Middleware

**File**: `apps/api/src/middleware/errorHandler.ts`

```typescript
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';

/**
 * Global error handler middleware.
 * Converts errors to standard JSON format.
 */
export async function errorHandler(
  error: FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log error
  request.log.error(error);

  // Handle custom app errors
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(error.toJSON());
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      errors: error.validation,
    });
  }

  // Handle generic errors
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    error: error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode,
  });
}
```

### Register Error Handler

**File**: `apps/api/src/server.ts`

```typescript
import { errorHandler } from './middleware/errorHandler.js';

// Register error handler
fastify.setErrorHandler(errorHandler);
```

---

## React Data Fetching

### Pattern: API Client

**File**: `apps/web/src/lib/api.ts`

```typescript
import { config } from './config';
import type { 
  Ticket, 
  CreateTicket, 
  UpdateTicketStatus 
} from '@eutonafila/shared';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP request.
   */
  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * Get shop queue.
   */
  async getQueue(shopSlug: string) {
    return this.request<{
      shop: any;
      tickets: Ticket[];
    }>(`/shops/${shopSlug}/queue`);
  }

  /**
   * Create ticket.
   */
  async createTicket(shopSlug: string, data: CreateTicket) {
    return this.request<Ticket>(`/shops/${shopSlug}/tickets`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update ticket status.
   */
  async updateTicketStatus(
    ticketId: number,
    data: UpdateTicketStatus
  ) {
    return this.request<Ticket>(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get ticket by ID.
   */
  async getTicket(ticketId: number) {
    return this.request<Ticket>(`/tickets/${ticketId}`);
  }
}

export const api = new ApiClient(config.apiBase);
```

### Pattern: Data Fetching Component

```typescript
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import type { Ticket } from '@eutonafila/shared';

export function QueuePage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQueue('mineiro');
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {tickets.map(ticket => (
        <div key={ticket.id}>{ticket.customerName}</div>
      ))}
    </div>
  );
}
```

---

## Custom React Hooks

### Pattern: Data Fetching Hook

```typescript
/**
 * Hook for fetching and managing queue data.
 * 
 * @param shopSlug - Shop identifier
 * @returns Queue data and operations
 * 
 * @example
 * ```typescript
 * const { tickets, loading, error, refresh } = useQueue('mineiro');
 * ```
 */
export function useQueue(shopSlug: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQueue(shopSlug);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return {
    tickets,
    loading,
    error,
    refresh: loadQueue,
  };
}
```

### Pattern: WebSocket Integration Hook

```typescript
/**
 * Hook for real-time queue updates via WebSocket.
 * 
 * @param shopSlug - Shop identifier
 * @returns Real-time queue data
 */
export function useRealtimeQueue(shopSlug: string) {
  const { tickets, loading, error, refresh } = useQueue(shopSlug);
  const { lastEvent } = useWebSocket(shopSlug);

  useEffect(() => {
    if (!lastEvent) return;

    // Refresh on relevant events
    if (
      lastEvent.type === 'ticket.created' ||
      lastEvent.type === 'ticket.status.changed'
    ) {
      refresh();
    }
  }, [lastEvent, refresh]);

  return { tickets, loading, error };
}
```

