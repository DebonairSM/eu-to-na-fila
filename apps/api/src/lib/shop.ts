import { db, schema } from '../db/index.js';
import { and, eq } from 'drizzle-orm';
import { env } from '../env.js';
import type { InferSelectModel } from 'drizzle-orm';

type Project = InferSelectModel<typeof schema.projects>;
type Shop = InferSelectModel<typeof schema.shops>;

const projectSlug = (): string => env.PROJECT_SLUG ?? env.SHOP_SLUG;

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
 * Resolves shop by slug within the current project (PROJECT_SLUG or SHOP_SLUG env).
 * Use for public API routes (e.g. GET /api/shops/:slug/queue) so lookups are correct
 * when multiple projects exist.
 */
export async function getShopBySlug(shopSlug: string): Promise<Shop | undefined> {
  const slug = projectSlug();
  const project = await getProjectBySlug(slug);
  if (!project) return undefined;
  const shop = await db.query.shops.findFirst({
    where: and(
      eq(schema.shops.projectId, project.id),
      eq(schema.shops.slug, shopSlug)
    ),
  });
  return shop;
}
