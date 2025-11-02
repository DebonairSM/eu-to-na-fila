# Example: Adding a New API Endpoint

This example shows how to add a new API endpoint for managing notifications. We'll create a complete feature from database to frontend.

## Goal

Create a notifications system that allows:
- Getting all notifications for a shop
- Creating a new notification
- Marking notifications as read
- Broadcasting new notifications via WebSocket

## Step 1: Define Zod Schema

**File:** `packages/shared/src/schemas/notification.ts`

```typescript
import { z } from 'zod';

export const notificationSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'error', 'success']),
  isRead: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationSchema = z.object({
  shopId: z.number(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
});

export type CreateNotification = z.infer<typeof createNotificationSchema>;

export const markReadSchema = z.object({
  isRead: z.boolean(),
});

export type MarkRead = z.infer<typeof markReadSchema>;
```

**File:** `packages/shared/src/index.ts` (add export)

```typescript
export * from './schemas/notification.js';
```

## Step 2: Create Database Table

**File:** `apps/api/src/db/schema.ts` (add table)

```typescript
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('info'), // info, warning, error, success
  isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  shop: one(shops, {
    fields: [notifications.shopId],
    references: [shops.id],
  }),
}));

// Add to shops relations
export const shopsRelations = relations(shops, ({ many }) => ({
  // ... existing relations
  notifications: many(notifications),
}));
```

**Generate and run migration:**

```bash
cd apps/api
pnpm db:generate
pnpm db:migrate
```

## Step 3: Create Service Class

**File:** `apps/api/src/services/NotificationService.ts`

```typescript
import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import type { CreateNotification, Notification } from '@eutonafila/shared';
import { NotFoundError } from '../lib/errors.js';

/**
 * Service for managing notifications.
 */
export class NotificationService {
  /**
   * Get all notifications for a shop.
   * 
   * @param shopId - Shop database ID
   * @param unreadOnly - Only return unread notifications
   * @returns Array of notifications
   */
  async getByShop(
    shopId: number,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    const whereClause = unreadOnly
      ? and(
          eq(schema.notifications.shopId, shopId),
          eq(schema.notifications.isRead, false)
        )
      : eq(schema.notifications.shopId, shopId);

    const notifications = await db.query.notifications.findMany({
      where: whereClause,
      orderBy: [desc(schema.notifications.createdAt)],
    });

    return notifications;
  }

  /**
   * Get a notification by ID.
   * 
   * @param id - Notification ID
   * @returns The notification or null
   */
  async getById(id: number): Promise<Notification | null> {
    const notification = await db.query.notifications.findFirst({
      where: eq(schema.notifications.id, id),
    });

    return notification || null;
  }

  /**
   * Create a new notification.
   * 
   * @param data - Notification data
   * @returns Created notification
   */
  async create(data: CreateNotification): Promise<Notification> {
    const [notification] = await db
      .insert(schema.notifications)
      .values({
        ...data,
        isRead: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return notification;
  }

  /**
   * Mark a notification as read/unread.
   * 
   * @param id - Notification ID
   * @param isRead - Read status
   * @returns Updated notification
   */
  async markRead(id: number, isRead: boolean): Promise<Notification> {
    const [notification] = await db
      .update(schema.notifications)
      .set({
        isRead,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.notifications.id, id))
      .returning();

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a shop.
   * 
   * @param shopId - Shop database ID
   * @returns Number of notifications updated
   */
  async markAllRead(shopId: number): Promise<number> {
    const result = await db
      .update(schema.notifications)
      .set({
        isRead: true,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.notifications.shopId, shopId),
          eq(schema.notifications.isRead, false)
        )
      )
      .returning();

    return result.length;
  }

  /**
   * Delete a notification.
   * 
   * @param id - Notification ID
   */
  async delete(id: number): Promise<void> {
    const result = await db
      .delete(schema.notifications)
      .where(eq(schema.notifications.id, id))
      .returning();

    if (result.length === 0) {
      throw new NotFoundError('Notification not found');
    }
  }
}

export const notificationService = new NotificationService();
```

## Step 4: Add WebSocket Event Type

**File:** `packages/shared/src/types/websocket.ts` (add to existing)

```typescript
// Add to WebSocketEventType union
export type WebSocketEventType = 
  // ... existing types
  | 'notification.created';

// Add new event interface
export interface NotificationCreatedEvent {
  type: 'notification.created';
  shopId: string;
  timestamp: string;
  data: {
    notification: Notification;
  };
}

// Add to AnyWebSocketEvent union
export type AnyWebSocketEvent =
  // ... existing types
  | NotificationCreatedEvent;
```

**File:** `apps/api/src/services/WebSocketService.ts` (add method)

```typescript
/**
 * Broadcast notification created event.
 */
broadcastNotificationCreated(
  shopId: string,
  notification: Notification
): void {
  const event: NotificationCreatedEvent = {
    type: 'notification.created',
    shopId,
    timestamp: new Date().toISOString(),
    data: {
      notification,
    },
  };

  this.broadcast(shopId, event);
}
```

## Step 5: Create Route Handler

**File:** `apps/api/src/routes/notifications.ts`

```typescript
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { createNotificationSchema, markReadSchema } from '@eutonafila/shared';
import { notificationService } from '../services/NotificationService.js';
import { websocketService } from '../services/WebSocketService.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Notification routes.
 */
export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all notifications for a shop.
   * 
   * @route GET /api/shops/:slug/notifications
   */
  fastify.get('/shops/:slug/notifications', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const querySchema = z.object({
      unreadOnly: z.enum(['true', 'false']).optional(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { unreadOnly } = validateRequest(querySchema, request.query);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Get notifications
    const notifications = await notificationService.getByShop(
      shop.id,
      unreadOnly === 'true'
    );

    return { notifications };
  });

  /**
   * Create a new notification.
   * 
   * @route POST /api/shops/:slug/notifications
   */
  fastify.post('/shops/:slug/notifications', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Validate body
    const bodySchema = z.object({
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(1000),
      type: z.enum(['info', 'warning', 'error', 'success']).optional(),
    });
    const data = validateRequest(bodySchema, request.body);

    // Create notification
    const notification = await notificationService.create({
      ...data,
      shopId: shop.id,
    });

    // Broadcast WebSocket event
    websocketService.broadcastNotificationCreated(slug, notification);

    return reply.status(201).send(notification);
  });

  /**
   * Mark notification as read.
   * 
   * @route PATCH /api/notifications/:id/read
   */
  fastify.patch('/notifications/:id/read', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    const data = validateRequest(markReadSchema, request.body);

    const notification = await notificationService.markRead(id, data.isRead);

    return notification;
  });

  /**
   * Delete a notification.
   * 
   * @route DELETE /api/notifications/:id
   */
  fastify.delete('/notifications/:id', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const { id } = validateRequest(paramsSchema, request.params);

    await notificationService.delete(id);

    return reply.status(204).send();
  });
};
```

## Step 6: Register Route

**File:** `apps/api/src/server.ts` (update)

```typescript
import { notificationRoutes } from './routes/notifications.js';

// In the API routes section
fastify.register(
  async (instance) => {
    instance.register(queueRoutes);
    instance.register(ticketRoutes);
    instance.register(statusRoutes);
    instance.register(notificationRoutes); // Add this
  },
  { prefix: '/api' }
);
```

## Step 7: Update API Client (Frontend)

**File:** `apps/web/src/lib/api.ts` (add methods)

```typescript
/**
 * Get notifications for a shop.
 */
async getNotifications(
  shopSlug: string,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  const params = unreadOnly ? '?unreadOnly=true' : '';
  const response = await this.get<{ notifications: Notification[] }>(
    `/shops/${shopSlug}/notifications${params}`
  );
  return response.notifications;
}

/**
 * Create a notification.
 */
async createNotification(
  shopSlug: string,
  data: {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
  }
): Promise<Notification> {
  return this.post(`/shops/${shopSlug}/notifications`, data);
}

/**
 * Mark notification as read.
 */
async markNotificationRead(
  notificationId: number,
  isRead: boolean
): Promise<Notification> {
  return this.patch(`/notifications/${notificationId}/read`, { isRead });
}
```

## Testing

### Test the API with curl

```bash
# Create notification
curl -X POST http://localhost:3000/api/shops/mineiro/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Welcome",
    "message": "Queue system is now active!",
    "type": "info"
  }'

# Get notifications
curl http://localhost:3000/api/shops/mineiro/notifications

# Get unread only
curl http://localhost:3000/api/shops/mineiro/notifications?unreadOnly=true

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications/1/read \
  -H "Content-Type: application/json" \
  -d '{"isRead": true}'
```

### Test with TypeScript

```typescript
import { api } from './lib/api';

// Create notification
const notification = await api.createNotification('mineiro', {
  title: 'New Feature',
  message: 'Check out our new notifications!',
  type: 'success'
});

// Get all notifications
const all = await api.getNotifications('mineiro');

// Get unread only
const unread = await api.getNotifications('mineiro', true);

// Mark as read
await api.markNotificationRead(notification.id, true);
```

## Summary

You've successfully added a complete API endpoint with:

✅ Type-safe schemas (Zod)  
✅ Database table with relations  
✅ Service layer with business logic  
✅ Route handlers with validation  
✅ WebSocket event broadcasting  
✅ Frontend API client methods  
✅ Error handling throughout  

Next: See [Creating a React Page](./04-create-react-page.md) to build the UI for this feature.

