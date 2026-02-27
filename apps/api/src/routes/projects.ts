import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { asc, inArray } from 'drizzle-orm';

/**
 * Projects routes.
 * Public listing of projects (barbershops) for the projects page.
 * Only projects that have at least one shop are returned, so orphan project rows never appear.
 */
export const projectsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List all projects (barbershops) that have a shop.
   * Public endpoint, no auth required.
   *
   * @route GET /api/projects
   * @returns Array of projects with id, slug, name, path
   */
  fastify.get('/projects', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
    const projectIdsWithShops = await db
      .selectDistinct({ projectId: schema.shops.projectId })
      .from(schema.shops);
    const ids = projectIdsWithShops
      .map((r) => r.projectId)
      .filter((id): id is number => id != null);
    if (ids.length === 0) {
      return [];
    }
    const rows = await db
      .select({
        id: schema.projects.id,
        slug: schema.projects.slug,
        name: schema.projects.name,
        path: schema.projects.path,
      })
      .from(schema.projects)
      .where(inArray(schema.projects.id, ids))
      .orderBy(asc(schema.projects.name));

    // Always return short path (e.g. /shop) for display/links; normalize legacy /projects/:slug
    return rows.map((r) => {
      const path = (r.path ?? '').replace(/\/+$/, '');
      const shortPath = path.startsWith('/projects/') ? `/${r.slug}` : (path || `/${r.slug}`);
      return { ...r, path: shortPath };
    });
  });
};
