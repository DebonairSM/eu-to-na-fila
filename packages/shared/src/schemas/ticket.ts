import { z } from 'zod';

export const ticketStatusSchema = z.enum(['waiting', 'in_progress', 'completed', 'cancelled']);
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

export const ticketSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  serviceId: z.number(),
  barberId: z.number().optional(),
  preferredBarberId: z.number().optional(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().optional(),
  status: ticketStatusSchema,
  position: z.number().int().nonnegative(),
  estimatedWaitTime: z.number().int().nonnegative().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const createTicketSchema = z.object({
  shopId: z.number(),
  serviceId: z.number(),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().optional(),
  preferredBarberId: z.number().optional(),
});
export type CreateTicket = z.infer<typeof createTicketSchema>;

export const updateTicketStatusSchema = z.object({
  status: ticketStatusSchema,
  barberId: z.number().optional(),
});
export type UpdateTicketStatus = z.infer<typeof updateTicketStatusSchema>;

