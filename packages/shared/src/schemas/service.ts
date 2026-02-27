import { z } from 'zod';

export const serviceKindSchema = z.enum(['main', 'complementary']);
export type ServiceKind = z.infer<typeof serviceKindSchema>;

export const serviceSchema = z.object({
  id: z.number(),
  shopId: z.number(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  duration: z.number().int().positive(),
  price: z.number().positive().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  kind: serviceKindSchema.default('complementary'),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Service = z.infer<typeof serviceSchema>;

export const createServiceSchema = serviceSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateService = z.infer<typeof createServiceSchema>;

