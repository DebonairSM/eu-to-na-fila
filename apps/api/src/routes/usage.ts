import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../lib/validation.js';
import { getEgressStatsService } from '../services/EgressStatsService.js';

export const usageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/usage/egress',
    {
      preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
    },
    async (request, reply) => {
      const querySchema = z.object({
        limit: z.coerce.number().int().min(1).max(500).optional(),
      });
      const { limit } = validateRequest(querySchema, request.query);
      reply.header('Cache-Control', 'no-store');
      return getEgressStatsService().snapshot(limit ?? 100);
    }
  );

  fastify.get(
    '/usage/ads',
    {
      preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
    },
    async (_request, reply) => {
      const snapshot = getEgressStatsService().snapshot(200);
      const adMediaEndpoint = snapshot.endpoints.find((row) => row.endpoint === '/api/ads/:id/media') ?? null;
      reply.header('Cache-Control', 'no-store');
      return {
        since: snapshot.since,
        uploads: snapshot.uploads,
        adMedia: snapshot.adMedia,
        topAds: snapshot.topAds,
        uploadTrend: snapshot.uploadTrend,
        adMediaEndpoint,
      };
    }
  );
};
