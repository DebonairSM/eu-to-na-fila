import { pgTable, text, integer, boolean, timestamp, serial, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const companyAdmins = pgTable('company_admins', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('company_admins_company_id_idx').on(table.companyId),
  usernameIdx: index('company_admins_username_idx').on(table.username),
}));

export const shops = pgTable('shops', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companies.id),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain'),
  path: text('path'),
  apiBase: text('api_base'),
  theme: text('theme'), // JSON stored as text
  ownerPin: text('owner_pin'), // Legacy: plain text PIN (deprecated, use ownerPinHash)
  staffPin: text('staff_pin'), // Legacy: plain text PIN (deprecated, use staffPinHash)
  ownerPinHash: text('owner_pin_hash'), // Hashed owner PIN
  staffPinHash: text('staff_pin_hash'), // Hashed staff PIN
  ownerPinResetRequired: boolean('owner_pin_reset_required').notNull().default(true), // Require PIN reset on next login
  staffPinResetRequired: boolean('staff_pin_reset_required').notNull().default(true), // Require PIN reset on next login
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('shops_company_id_idx').on(table.companyId),
}));

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
  preferredBarberId: integer('preferred_barber_id').references(() => barbers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  status: text('status').notNull().default('waiting'), // waiting, in_progress, completed, cancelled
  position: integer('position').notNull().default(0),
  estimatedWaitTime: integer('estimated_wait_time'), // in minutes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'), // when service started (status → in_progress)
  completedAt: timestamp('completed_at'), // when service completed (status → completed)
  cancelledAt: timestamp('cancelled_at'), // when ticket cancelled (status → cancelled)
  barberAssignedAt: timestamp('barber_assigned_at'), // when barber was assigned
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  admins: many(companyAdmins),
  shops: many(shops),
}));

export const companyAdminsRelations = relations(companyAdmins, ({ one }) => ({
  company: one(companies, { fields: [companyAdmins.companyId], references: [companies.id] }),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  company: one(companies, { fields: [shops.companyId], references: [companies.id] }),
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

export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  ticketId: integer('ticket_id').references(() => tickets.id),
  action: text('action').notNull(), // ticket_created, barber_assigned, service_started, etc.
  actorType: text('actor_type').notNull(), // customer, staff, owner, system
  actorId: integer('actor_id'), // user/barber ID (nullable)
  metadata: jsonb('metadata'), // additional context
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  shopIdIdx: index('audit_log_shop_id_idx').on(table.shopId),
  ticketIdIdx: index('audit_log_ticket_id_idx').on(table.ticketId),
  actionIdx: index('audit_log_action_idx').on(table.action),
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
}));
