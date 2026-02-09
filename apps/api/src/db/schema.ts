import { pgTable, text, integer, boolean, timestamp, serial, jsonb, index, uniqueIndex, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  path: text('path').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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
  projectId: integer('project_id').notNull().references(() => projects.id),
  companyId: integer('company_id').references(() => companies.id),
  slug: text('slug').notNull(),
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
  homeContent: jsonb('home_content'), // Per-shop home page copy: hero, services, about, location
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('shops_company_id_idx').on(table.companyId),
  projectIdIdx: index('shops_project_id_idx').on(table.projectId),
  projectSlugUnique: uniqueIndex('shops_project_id_slug_unique').on(table.projectId, table.slug),
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
  username: text('username'),
  passwordHash: text('password_hash'),
  isActive: boolean('is_active').notNull().default(true),
  isPresent: boolean('is_present').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  shopUsernameUnique: uniqueIndex('barbers_shop_username_unique').on(table.shopId, table.username),
}));

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  barberId: integer('barber_id').references(() => barbers.id),
  preferredBarberId: integer('preferred_barber_id').references(() => barbers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone'),
  deviceId: text('device_id'), // Device identifier for preventing multiple active tickets per device
  status: text('status').notNull().default('waiting'), // waiting, in_progress, completed, cancelled
  position: integer('position').notNull().default(0),
  estimatedWaitTime: integer('estimated_wait_time'), // in minutes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  startedAt: timestamp('started_at'), // when service started (status → in_progress)
  completedAt: timestamp('completed_at'), // when service completed (status → completed)
  cancelledAt: timestamp('cancelled_at'), // when ticket cancelled (status → cancelled)
  barberAssignedAt: timestamp('barber_assigned_at'), // when barber was assigned
}, (table) => ({
  shopDeviceIdx: index('tickets_shop_device_idx').on(table.shopId, table.deviceId),
}));

export const companyAds = pgTable('company_ads', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id),
  shopId: integer('shop_id').references(() => shops.id), // Optional: shop-specific ads
  position: integer('position').notNull().default(0), // Ordering within company/shop
  enabled: boolean('enabled').notNull().default(false), // Only enabled ads appear in manifest
  mediaType: text('media_type').notNull(), // 'image' or 'video'
  mimeType: text('mime_type').notNull(), // e.g., 'image/png', 'video/mp4'
  bytes: integer('bytes').notNull(), // File size in bytes
  storageKey: text('storage_key').notNull(), // Object storage key/path
  publicUrl: text('public_url').notNull(), // Public URL for the media
  etag: text('etag'), // ETag from storage for validation
  version: integer('version').notNull().default(1), // Increments on update for cache busting
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  companyIdIdx: index('company_ads_company_id_idx').on(table.companyId),
  shopIdIdx: index('company_ads_shop_id_idx').on(table.shopId),
  enabledIdx: index('company_ads_enabled_idx').on(table.enabled),
  positionIdx: index('company_ads_position_idx').on(table.companyId, table.shopId, table.position),
}));

// Relations
export const projectsRelations = relations(projects, ({ many }) => ({
  shops: many(shops),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  admins: many(companyAdmins),
  shops: many(shops),
  ads: many(companyAds),
}));

export const companyAdminsRelations = relations(companyAdmins, ({ one }) => ({
  company: one(companies, { fields: [companyAdmins.companyId], references: [companies.id] }),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  project: one(projects, { fields: [shops.projectId], references: [projects.id] }),
  company: one(companies, { fields: [shops.companyId], references: [companies.id] }),
  services: many(services),
  barbers: many(barbers),
  tickets: many(tickets),
  ads: many(companyAds),
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

export const companyAdsRelations = relations(companyAds, ({ one }) => ({
  company: one(companies, { fields: [companyAds.companyId], references: [companies.id] }),
  shop: one(shops, { fields: [companyAds.shopId], references: [shops.id] }),
}));

// Per-barber, per-service, per-day-of-week average service duration stats.
// Used by QueueService to estimate wait times based on actual historical data.
export const barberServiceWeekdayStats = pgTable('barber_service_weekday_stats', {
  id: serial('id').primaryKey(),
  barberId: integer('barber_id').notNull().references(() => barbers.id),
  serviceId: integer('service_id').notNull().references(() => services.id),
  shopId: integer('shop_id').notNull().references(() => shops.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday .. 6=Saturday (JS Date.getDay())
  avgDuration: real('avg_duration').notNull().default(0), // average in minutes
  totalCompleted: integer('total_completed').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  barberServiceDayUnique: uniqueIndex('bsws_barber_service_day_unique').on(table.barberId, table.serviceId, table.dayOfWeek),
  shopIdIdx: index('bsws_shop_id_idx').on(table.shopId),
  barberIdIdx: index('bsws_barber_id_idx').on(table.barberId),
}));

export const barberServiceWeekdayStatsRelations = relations(barberServiceWeekdayStats, ({ one }) => ({
  barber: one(barbers, { fields: [barberServiceWeekdayStats.barberId], references: [barbers.id] }),
  service: one(services, { fields: [barberServiceWeekdayStats.serviceId], references: [services.id] }),
  shop: one(shops, { fields: [barberServiceWeekdayStats.shopId], references: [shops.id] }),
}));
