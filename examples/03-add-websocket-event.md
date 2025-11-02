# Example: Adding a WebSocket Event

This example shows how to add a new real-time WebSocket event for broadcasting when a barber goes online/offline.

## Goal

Broadcast barber availability status changes to all connected clients so the UI can update in real-time.

## Step 1: Define Event Type

**File:** `packages/shared/src/types/websocket.ts`

```typescript
// Add to WebSocketEventType union
export type WebSocketEventType = 
  | 'connection.established'
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.status.changed'
  | 'ticket.deleted'
  | 'metrics.updated'
  | 'barber.status.changed'  // Add this
  | 'queue.cleared'
  | 'error';

// Add event interface
/**
 * Sent when a barber's availability status changes.
 */
export interface BarberStatusChangedEvent {
  type: 'barber.status.changed';
  shopId: string;
  timestamp: string;
  data: {
    /**
     * Barber ID.
     */
    barberId: number;

    /**
     * New active status.
     */
    isActive: boolean;

    /**
     * Barber name.
     */
    name: string;
  };
}

// Add to AnyWebSocketEvent union
export type AnyWebSocketEvent =
  | ConnectionEstablishedEvent
  | TicketCreatedEvent
  | TicketUpdatedEvent
  | TicketStatusChangedEvent
  | TicketDeletedEvent
  | MetricsUpdatedEvent
  | BarberStatusChangedEvent  // Add this
  | QueueClearedEvent
  | ErrorEvent;
```

## Step 2: Add Broadcast Method to WebSocketService

**File:** `apps/api/src/services/WebSocketService.ts`

```typescript
/**
 * Broadcast barber status change event.
 * 
 * @param shopId - Shop identifier
 * @param barberId - Barber ID
 * @param isActive - New active status
 * @param barberName - Barber name
 * 
 * @example
 * ```typescript
 * websocketService.broadcastBarberStatusChanged(
 *   'mineiro',
 *   3,
 *   true,
 *   'Carlos Silva'
 * );
 * ```
 */
broadcastBarberStatusChanged(
  shopId: string,
  barberId: number,
  isActive: boolean,
  barberName: string
): void {
  const event: BarberStatusChangedEvent = {
    type: 'barber.status.changed',
    shopId,
    timestamp: new Date().toISOString(),
    data: {
      barberId,
      isActive,
      name: barberName,
    },
  };

  this.broadcast(shopId, event);
}
```

## Step 3: Create Barber Service (if doesn't exist)

**File:** `apps/api/src/services/BarberService.ts`

```typescript
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import type { Barber } from '@eutonafila/shared';
import { NotFoundError } from '../lib/errors.js';

/**
 * Service for managing barbers.
 */
export class BarberService {
  /**
   * Get all barbers for a shop.
   * 
   * @param shopId - Shop database ID
   * @param activeOnly - Only return active barbers
   * @returns Array of barbers
   */
  async getByShop(
    shopId: number,
    activeOnly: boolean = false
  ): Promise<Barber[]> {
    const whereClause = activeOnly
      ? and(
          eq(schema.barbers.shopId, shopId),
          eq(schema.barbers.isActive, true)
        )
      : eq(schema.barbers.shopId, shopId);

    const barbers = await db.query.barbers.findMany({
      where: whereClause,
    });

    return barbers;
  }

  /**
   * Get a barber by ID.
   * 
   * @param id - Barber ID
   * @returns The barber or null
   */
  async getById(id: number): Promise<Barber | null> {
    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    return barber || null;
  }

  /**
   * Update barber active status.
   * 
   * @param id - Barber ID
   * @param isActive - New active status
   * @returns Updated barber
   * @throws {NotFoundError} If barber doesn't exist
   */
  async updateStatus(id: number, isActive: boolean): Promise<Barber> {
    const [barber] = await db
      .update(schema.barbers)
      .set({
        isActive,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.barbers.id, id))
      .returning();

    if (!barber) {
      throw new NotFoundError('Barber not found');
    }

    return barber;
  }
}

export const barberService = new BarberService();
```

## Step 4: Create API Endpoint

**File:** `apps/api/src/routes/barbers.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { barberService } from '../services/BarberService.js';
import { websocketService } from '../services/WebSocketService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Barber routes.
 */
export const barberRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all barbers for a shop.
   * 
   * @route GET /api/shops/:slug/barbers
   */
  fastify.get('/shops/:slug/barbers', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      activeOnly: z.enum(['true', 'false']).optional(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { activeOnly } = validateRequest(querySchema, request.query);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Get barbers
    const barbers = await barberService.getByShop(
      shop.id,
      activeOnly === 'true'
    );

    return { barbers };
  });

  /**
   * Update barber active status.
   * 
   * @route PATCH /api/barbers/:id/status
   */
  fastify.patch('/barbers/:id/status', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      isActive: z.boolean(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const { isActive } = validateRequest(bodySchema, request.body);

    // Get existing barber for shop slug
    const existingBarber = await barberService.getById(id);
    if (!existingBarber) {
      throw new NotFoundError('Barber not found');
    }

    // Update status
    const barber = await barberService.updateStatus(id, isActive);

    // Get shop for broadcast
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.id, barber.shopId),
    });

    if (shop) {
      // Broadcast status change
      websocketService.broadcastBarberStatusChanged(
        shop.slug,
        barber.id,
        barber.isActive,
        barber.name
      );
    }

    return barber;
  });
};
```

## Step 5: Register Route

**File:** `apps/api/src/server.ts`

```typescript
import { barberRoutes } from './routes/barbers.js';

// In the API routes section
fastify.register(
  async (instance) => {
    instance.register(queueRoutes);
    instance.register(ticketRoutes);
    instance.register(statusRoutes);
    instance.register(barberRoutes); // Add this
  },
  { prefix: '/api' }
);
```

## Step 6: Handle Event in React

**File:** `apps/web/src/hooks/useBarbers.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useWebSocket } from './useWebSocket';
import type { Barber } from '@eutonafila/shared';

/**
 * Hook for managing barbers with real-time updates.
 * 
 * @param shopSlug - Shop identifier
 * @returns Barbers, loading state, and refresh function
 */
export function useBarbers(shopSlug: string) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { lastEvent } = useWebSocket(shopSlug);

  // Load barbers
  const loadBarbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBarbers(shopSlug);
      setBarbers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load barbers');
    } finally {
      setLoading(false);
    }
  }, [shopSlug]);

  // Initial load
  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  // Handle WebSocket events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'barber.status.changed') {
      const { barberId, isActive, name } = lastEvent.data;

      // Update barber status in local state
      setBarbers(prev =>
        prev.map(barber =>
          barber.id === barberId
            ? { ...barber, isActive }
            : barber
        )
      );

      // Show notification to user
      console.log(`${name} is now ${isActive ? 'online' : 'offline'}`);
    }
  }, [lastEvent]);

  return {
    barbers,
    loading,
    error,
    refresh: loadBarbers,
  };
}
```

**File:** `apps/web/src/components/BarberList.tsx`

```typescript
import { useBarbers } from '../hooks/useBarbers';

export function BarberList({ shopSlug }: { shopSlug: string }) {
  const { barbers, loading, error } = useBarbers(shopSlug);

  if (loading) return <div>Loading barbers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="barber-list">
      <h2>Barbers</h2>
      {barbers.map(barber => (
        <div
          key={barber.id}
          className={`barber-item ${barber.isActive ? 'active' : 'inactive'}`}
        >
          <span className="name">{barber.name}</span>
          <span className={`status ${barber.isActive ? 'online' : 'offline'}`}>
            {barber.isActive ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

## Step 7: Update API Client

**File:** `apps/web/src/lib/api.ts`

```typescript
/**
 * Get all barbers for a shop.
 */
async getBarbers(shopSlug: string, activeOnly: boolean = false): Promise<Barber[]> {
  const params = activeOnly ? '?activeOnly=true' : '';
  const response = await this.get<{ barbers: Barber[] }>(
    `/shops/${shopSlug}/barbers${params}`
  );
  return response.barbers;
}

/**
 * Update barber active status.
 */
async updateBarberStatus(
  barberId: number,
  isActive: boolean
): Promise<Barber> {
  return this.patch(`/barbers/${barberId}/status`, { isActive });
}
```

## Testing the Event

### Backend Test (curl)

```bash
# Set barber to active
curl -X PATCH http://localhost:3000/api/barbers/1/status \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'

# Set barber to inactive
curl -X PATCH http://localhost:3000/api/barbers/1/status \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
```

### Frontend Test

```typescript
import { api } from './lib/api';

// Toggle barber status
const barber = await api.updateBarberStatus(1, false);
console.log(`${barber.name} is now ${barber.isActive ? 'active' : 'inactive'}`);

// All connected clients should receive the WebSocket event
// and update their UI automatically
```

### WebSocket Test (Browser Console)

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000/ws?shopId=mineiro');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received event:', data);
  
  if (data.type === 'barber.status.changed') {
    console.log(`Barber ${data.data.name} is now ${data.data.isActive ? 'online' : 'offline'}`);
  }
};

ws.onopen = () => console.log('Connected');
ws.onerror = (error) => console.error('Error:', error);
```

## Best Practices

1. **Type Safety** - Define event types in shared package
2. **Payload Size** - Keep event data minimal, send IDs not full objects
3. **Event Naming** - Use `resource.action` pattern (e.g., `barber.status.changed`)
4. **Broadcast Timing** - Emit after database commit, not before
5. **Error Handling** - Handle WebSocket errors gracefully in clients
6. **Reconnection** - Implement auto-reconnect with exponential backoff
7. **State Sync** - Refresh full state periodically to catch missed events

## Advanced Patterns

### Selective Broadcasting

Only broadcast to specific client types:

```typescript
// In WebSocketService
broadcastToRole(
  shopId: string,
  event: WebSocketEvent,
  role: 'staff' | 'customer'
): void {
  for (const [clientId, client] of this.clients.entries()) {
    if (client.shopId === shopId && client.role === role) {
      // Send to matching clients only
    }
  }
}
```

### Event Acknowledgment

Require client acknowledgment:

```typescript
interface AckEvent {
  type: 'ack';
  eventId: string;
}

// Client sends acknowledgment
ws.send(JSON.stringify({
  type: 'ack',
  eventId: event.id
}));
```

### Event History

Store recent events for reconnecting clients:

```typescript
class WebSocketService {
  private eventHistory: Map<string, WebSocketEvent[]> = new Map();

  broadcast(shopId: string, event: WebSocketEvent): void {
    // Store event
    if (!this.eventHistory.has(shopId)) {
      this.eventHistory.set(shopId, []);
    }
    this.eventHistory.get(shopId)!.push(event);

    // Keep last 100 events
    if (this.eventHistory.get(shopId)!.length > 100) {
      this.eventHistory.get(shopId)!.shift();
    }

    // Broadcast as usual
    // ...
  }
}
```

## Summary

You've successfully:

✅ Defined a new WebSocket event type  
✅ Added broadcast method to WebSocketService  
✅ Created API endpoint that emits the event  
✅ Handled the event in React components  
✅ Implemented real-time UI updates  

Next: See [Creating a React Page](./04-create-react-page.md) to build a complete page with these patterns.

