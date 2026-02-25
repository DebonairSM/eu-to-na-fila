import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type Project = InferSelectModel<typeof schema.projects>;
type Shop = InferSelectModel<typeof schema.shops>;

/** Normalize path for lookup: leading slash, no trailing slash. */
function normalizePath(p: string): string {
  const s = p.replace(/\/+$/, '').trim();
  return s.startsWith('/') ? s : `/${s}`;
}

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
 * Resolves project by id. Used to get project path for redirects.
 */
export async function getProjectById(id: number): Promise<Project | undefined> {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, id),
  });
  return project;
}

/**
 * Resolves project by its URL path (e.g. /shops or /projects/mineiro).
 * Used to serve the SPA and assets at the project's configured path.
 */
export async function getProjectByPath(path: string): Promise<Project | undefined> {
  const normalized = normalizePath(path);
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.path, normalized),
  });
  return project;
}

/**
 * Given a request pathname (e.g. /shops/join or /projects/mineiro/owner),
 * returns the project and its path if the pathname is under a project path.
 */
export async function getProjectByPathname(pathname: string): Promise<{ project: Project; path: string } | undefined> {
  const normalized = normalizePath(pathname);
  const projects = await db.query.projects.findMany();
  for (const project of projects) {
    const projectPath = normalizePath(project.path);
    if (normalized === projectPath || normalized.startsWith(projectPath + '/')) {
      return { project, path: projectPath };
    }
  }
  return undefined;
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
 * Resolves shop by slug. Tries project slug first (for URL path /projects/:slug),
 * then falls back to shop slug (for company dashboard and callers that use the shop's slug).
 * This way both /api/shops/barbearia-premium/... (project slug) and
 * /api/shops/barbershop/... (shop slug when edited) work.
 */
export async function getShopBySlug(shopSlug: string): Promise<Shop | undefined> {
  const byProject = await getShopByProjectSlug(shopSlug);
  if (byProject) return byProject;
  return db.query.shops.findFirst({
    where: eq(schema.shops.slug, shopSlug),
  });
}

/**
 * Returns the frontend base path for a shop (e.g. /shops or /projects/mineiro).
 * Used for redirects and links so they use the project's path when set.
 */
export async function getShopFrontendPath(shop: Shop, projectSlug: string): Promise<string> {
  if (shop.path && shop.path.trim()) return shop.path.replace(/\/+$/, '');
  const project = await getProjectById(shop.projectId);
  return (project?.path ?? `/${projectSlug}`).replace(/\/+$/, '');
}
