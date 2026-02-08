import type { FastifyPluginAsync } from 'fastify';
import { db, schema } from '../db/index.js';
import { asc } from 'drizzle-orm';

/**
 * Projects routes.
 * Public listing of projects (barbershops) for the projects page.
 */
export const projectsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List all projects (barbershops).
   * Public endpoint, no auth required.
   *
   * @route GET /api/projects
   * @returns Array of projects with id, slug, name, path
   */
  fastify.get('/projects', async () => {
    const rows = await db
      .select({
        id: schema.projects.id,
        slug: schema.projects.slug,
        name: schema.projects.name,
        path: schema.projects.path,
      })
      .from(schema.projects)
      .orderBy(asc(schema.projects.name));

    return rows;
  });
};
