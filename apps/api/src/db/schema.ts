import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';

export const shops = sqliteTable('shops', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain'),
  path: text('path'),
  apiBase: text('api_base'),
  theme: text('theme', { mode: 'json' }).$type<{ primary: string; accent: string }>(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const services = sqliteTable('services', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // in minutes
  price: integer('price'), // in cents
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const barbers = sqliteTable('barbers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tickets = sqliteTable('tickets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  barberId: integer('barber_id').references(() => barbers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  status: text('status').notNull().default('waiting'), // waiting, in_progress, completed, cancelled
  position: integer('position').notNull().default(0),
  estimatedWaitTime: integer('estimated_wait_time'), // in minutes
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Relations
export const shopsRelations = relations(shops, ({ many }) => ({
  services: many(services),
  barbers: many(barbers),
  tickets: many(tickets),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  shop: one(shops, { fields: [services.shopId], references: [shops.id] }),
  tickets: many(tickets),
}));

export const barbersRelations = relations(barbers, ({ one, many }) => ({
  shop: one(shops, { fields: [barbers.shopId], references: [shops.id] }),
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  shop: one(shops, { fields: [tickets.shopId], references: [shops.id] }),
  service: one(services, { fields: [tickets.serviceId], references: [services.id] }),
  barber: one(barbers, { fields: [tickets.barberId], references: [barbers.id] }),
}));

