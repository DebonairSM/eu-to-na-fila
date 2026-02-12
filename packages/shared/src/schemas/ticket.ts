import { z } from 'zod';

export const ticketStatusSchema = z.enum(['pending', 'waiting', 'in_progress', 'completed', 'cancelled']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketTypeSchema = z.enum(['walkin', 'appointment']);
export type TicketType = z.infer<typeof ticketTypeSchema>;

/** Optional service info included in ticket API responses for display. */
export const ticketServiceSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const ticketSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  serviceId: z.number(),
  service: ticketServiceSchema.optional(), // Present when API embeds service for display
  barberId: z.number().optional(),
  preferredBarberId: z.number().optional(),
  clientId: z.number().optional().nullable(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().optional(),
  deviceId: z.string().optional(), // Device identifier for preventing multiple active tickets per device
  status: ticketStatusSchema,
  position: z.number().int().nonnegative(),
  estimatedWaitTime: z.number().int().nonnegative().optional(),
  type: ticketTypeSchema.optional(), // walkin | appointment; default walkin for existing/legacy
  scheduledTime: z.date().or(z.string()).optional().nullable(), // only for appointments
  checkInTime: z.date().or(z.string()).optional().nullable(), // when they entered the queue
  ticketNumber: z.string().optional().nullable(), // e.g. A-101, W-205
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
  startedAt: z.date().or(z.string()).optional(),
  completedAt: z.date().or(z.string()).optional(),
  cancelledAt: z.date().or(z.string()).optional(),
  barberAssignedAt: z.date().or(z.string()).optional(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const createTicketSchema = z.object({
  shopId: z.number(),
  serviceId: z.number(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().optional(),
  preferredBarberId: z.number().optional(),
  deviceId: z.string().optional(), // Device identifier for preventing multiple active tickets per device
});
export type CreateTicket = z.infer<typeof createTicketSchema>;

/** Staff or public book: create an appointment (type=appointment, status=pending). */
export const createAppointmentSchema = z.object({
  shopId: z.number(),
  serviceId: z.number(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().optional(),
  preferredBarberId: z.number().optional(),
  scheduledTime: z.union([z.string(), z.date()]), // ISO string or Date
});
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
  barberId: z.number().nullable().optional(),
});
export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>;

