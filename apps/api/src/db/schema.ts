import { pgTable, text, integer, boolean, timestamp, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const shops = pgTable('shops', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain'),
  path: text('path'),
  apiBase: text('api_base'),
  theme: text('theme'), // JSON stored as text
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
  description: text('description'),
  duration: integer('duration').notNull(), // in minutes
  price: integer('price'), // in cents
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const barbers = pgTable('barbers', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  isPresent: boolean('is_present').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  barberId: integer('barber_id').references(() => barbers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  status: text('status').notNull().default('waiting'), // waiting, in_progress, completed, cancelled
  position: integer('position').notNull().default(0),
  estimatedWaitTime: integer('estimated_wait_time'), // in minutes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
