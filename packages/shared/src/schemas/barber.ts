import { z } from 'zod';

export const barberSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Barber = z.infer<typeof barberSchema>;

export const createBarberSchema = barberSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateBarber = z.infer<typeof createBarberSchema>;

