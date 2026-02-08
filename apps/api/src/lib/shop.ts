import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type Project = InferSelectModel<typeof schema.projects>;
type Shop = InferSelectModel<typeof schema.shops>;

/**
 * Resolves project by slug. Used for project-scoped shop lookups.
 */
export async function getProjectBySlug(slug: string): Promise<Project | undefined> {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.slug, slug),
  });
  return project;
}

/**
 * Resolves shop by slug. Each project has one shop with matching slug (1:1).
 * Use for public API routes (e.g. GET /api/shops/:slug/queue).
 */
export async function getShopBySlug(shopSlug: string): Promise<Shop | undefined> {
  const shop = await db.query.shops.findFirst({
    where: eq(schema.shops.slug, shopSlug),
  });
  return shop;
}
