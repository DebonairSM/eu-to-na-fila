import { z } from 'zod';

export const shopSchema = z.object({
  id: z.number(),
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  domain: z.string().optional(),
  path: z.string().optional(),
  apiBase: z.string().url().optional(),
  theme: z.object({
    primary: z.string(),
    accent: z.string(),
  }).optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),
});

export type Shop = z.infer<typeof shopSchema>;

export const createShopSchema = shopSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CreateShop = z.infer<typeof createShopSchema>;

