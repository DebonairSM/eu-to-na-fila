# Example: Creating a Database Table

This example shows how to create a new database table with Drizzle ORM, including relations, migrations, and seeding.

## Goal

Create a `reviews` table for customer feedback on their barbershop experience.

## Step 1: Define Schema

**File:** `apps/api/src/db/schema.ts`

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

// Add new table definition
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  ticketId: integer('ticket_id').notNull().references(() => tickets.id),
  barberId: integer('barber_id').references(() => barbers.id),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Define relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  shop: one(shops, {
    fields: [reviews.shopId],
    references: [shops.id],
  }),
  ticket: one(tickets, {
    fields: [reviews.ticketId],
    references: [tickets.id],
  }),
  barber: one(barbers, {
    fields: [reviews.barberId],
    references: [barbers.id],
  }),
}));

// Add to existing relations
export const shopsRelations = relations(shops, ({ many }) => ({
  services: many(services),
  barbers: many(barbers),
  tickets: many(tickets),
  reviews: many(reviews), // Add this
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  shop: one(shops, { fields: [tickets.shopId], references: [shops.id] }),
  service: one(services, { fields: [tickets.serviceId], references: [services.id] }),
  barber: one(barbers, { fields: [tickets.barberId], references: [barbers.id] }),
  review: one(reviews), // Add this
}));

export const barbersRelations = relations(barbers, ({ one, many }) => ({
  shop: one(shops, { fields: [barbers.shopId], references: [shops.id] }),
  tickets: many(tickets),
  reviews: many(reviews), // Add this
}));
```

## Step 2: Generate Migration

Run the Drizzle migration generator:

```bash
cd apps/api
pnpm db:generate
```

This creates a new migration file in `drizzle/` directory:

**File:** `drizzle/0001_create_reviews.sql`

```sql
CREATE TABLE `reviews` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `shop_id` integer NOT NULL,
  `ticket_id` integer NOT NULL,
  `barber_id` integer,
  `rating` integer NOT NULL,
  `comment` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`barber_id`) REFERENCES `barbers`(`id`) ON UPDATE no action ON DELETE no action
);
```

## Step 3: Run Migration

Apply the migration to your database:

```bash
pnpm db:migrate
```

You should see output like:
```
✅ Migration 0001_create_reviews.sql applied successfully
```

## Step 4: Create Zod Schema (Optional but Recommended)

**File:** `packages/shared/src/schemas/review.ts`

```typescript
import { z } from 'zod';

export const reviewSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  ticketId: z.number(),
  barberId: z.number().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Review = z.infer<typeof reviewSchema>;

export const createReviewSchema = z.object({
  shopId: z.number(),
  ticketId: z.number(),
  barberId: z.number().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export type CreateReview = z.infer<typeof createReviewSchema>;
```

**File:** `packages/shared/src/index.ts`

```typescript
export * from './schemas/review.js';
```

## Step 5: Add Seed Data (Optional)

**File:** `apps/api/src/seed.ts`

```typescript
// After creating tickets, add reviews
console.log('Creating reviews...');
await db.insert(schema.reviews).values([
  {
    shopId: shop.id,
    ticketId: 1, // Assuming ticket ID 1 exists
    barberId: barber1.id,
    rating: 5,
    comment: 'Excellent service! Very professional.',
  },
  {
    shopId: shop.id,
    ticketId: 2,
    barberId: barber2.id,
    rating: 4,
    comment: 'Good haircut, friendly atmosphere.',
  },
]);
```

Run seed:
```bash
pnpm db:seed
```

## Step 6: Query the New Table

Now you can query the reviews table:

```typescript
import { db, schema } from './db/index.js';
import { eq } from 'drizzle-orm';

// Get all reviews for a shop
const reviews = await db.query.reviews.findMany({
  where: eq(schema.reviews.shopId, shopId),
  with: {
    ticket: true,
    barber: true,
  },
  orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
});

// Get average rating for a barber
const barberReviews = await db.query.reviews.findMany({
  where: eq(schema.reviews.barberId, barberId),
});
const avgRating = barberReviews.reduce((sum, r) => sum + r.rating, 0) / barberReviews.length;

// Get review for a specific ticket
const review = await db.query.reviews.findFirst({
  where: eq(schema.reviews.ticketId, ticketId),
});
```

## Common Table Patterns

### One-to-Many Relationship

```typescript
// One shop has many barbers
export const shops = sqliteTable('shops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
});

export const barbers = sqliteTable('barbers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
});

export const shopsRelations = relations(shops, ({ many }) => ({
  barbers: many(barbers),
}));

export const barbersRelations = relations(barbers, ({ one }) => ({
  shop: one(shops, {
    fields: [barbers.shopId],
    references: [shops.id],
  }),
}));
```

### Many-to-Many Relationship

```typescript
// Barbers can work at multiple shops (junction table)
export const barberShops = sqliteTable('barber_shops', {
  barberId: integer('barber_id').notNull().references(() => barbers.id),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  startDate: text('start_date').notNull(),
});

export const barberShopsRelations = relations(barberShops, ({ one }) => ({
  barber: one(barbers, {
    fields: [barberShops.barberId],
    references: [barbers.id],
  }),
  shop: one(shops, {
    fields: [barberShops.shopId],
    references: [shops.id],
  }),
}));
```

### Unique Constraints

```typescript
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(), // Single column unique
  phoneNumber: text('phone_number'),
}, (table) => ({
  // Multi-column unique constraint
  uniquePhone: unique().on(table.phoneNumber),
}));
```

### Indexes for Performance

```typescript
export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  // Create index for faster queries
  shopStatusIdx: index('shop_status_idx').on(table.shopId, table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));
```

## Rolling Back a Migration

If you need to undo a migration:

1. Delete the migration file from `drizzle/` directory
2. Delete the corresponding entry from `drizzle/meta/_journal.json`
3. Drop the table manually:

```sql
DROP TABLE reviews;
```

Or create a new migration to remove it:

```bash
# Edit schema.ts (remove the table)
pnpm db:generate
pnpm db:migrate
```

## Best Practices

1. **Always use migrations** - Don't modify the database manually
2. **Test migrations locally** before deploying
3. **Use relations** for type-safe queries with `with`
4. **Add indexes** for frequently queried columns
5. **Use default values** for timestamps
6. **Document complex schemas** with comments
7. **Keep migrations small** - one logical change per migration

## Migrating to PostgreSQL

When ready to switch from SQLite to Postgres:

1. Update `drizzle.config.ts`:
```typescript
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
```

2. Update `apps/api/src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });
```

3. Change column types:
```typescript
// Before (SQLite)
id: integer('id').primaryKey({ autoIncrement: true }),

// After (Postgres)
id: serial('id').primaryKey(),
```

Your migrations will need to be regenerated, but the schema structure remains the same.

## Summary

You've successfully:

✅ Defined a new table with Drizzle ORM  
✅ Created and applied a migration  
✅ Defined relations for type-safe queries  
✅ Created Zod schema for validation  
✅ Added seed data  

Next: See [Adding a WebSocket Event](./03-add-websocket-event.md) to broadcast review creation in real-time.

