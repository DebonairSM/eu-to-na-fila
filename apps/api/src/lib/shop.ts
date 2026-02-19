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
 * Resolves shop by project slug (the segment in /projects/:slug).
 * The URL path is /projects/:slug, so the slug identifies the project; we then
 * return the shop for that project. This avoids returning the wrong shop when
 * multiple shops share the same slug across different projects.
 */
export async function getShopByProjectSlug(projectSlug: string): Promise<Shop | undefined> {
  const project = await getProjectBySlug(projectSlug);
  if (!project) return undefined;
  const shop = await db.query.shops.findFirst({
    where: eq(schema.shops.projectId, project.id),
  });
  return shop;
}

/**
 * Resolves shop by slug. Uses project slug so that /projects/:slug always
 * maps to the correct shop (one per project). Use for all public API routes.
 */
export async function getShopBySlug(shopSlug: string): Promise<Shop | undefined> {
  return getShopByProjectSlug(shopSlug);
}
