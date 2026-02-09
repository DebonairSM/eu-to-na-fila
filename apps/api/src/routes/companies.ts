import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';

/**
 * Company routes.
 * Handles company details and dashboard.
 * Shop CRUD lives in company-shops.ts.
 */
export const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get company details.
   * 
   * @route GET /api/companies/:id
   * @returns Company details
   */
  fastify.get(
    '/companies/:id',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const company = await db.query.companies.findFirst({
        where: eq(schema.companies.id, id),
      });

      if (!company) {
        throw new NotFoundError('Company not found');
      }

      return company;
    }
  );

  /**
   * Get company dashboard data.
   * 
   * @route GET /api/companies/:id/dashboard
   * @returns Dashboard statistics
   */
  fastify.get(
    '/companies/:id/dashboard',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shops = await db.query.shops.findMany({
        where: eq(schema.shops.companyId, id),
      });

      const enabledAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, id),
          eq(schema.companyAds.enabled, true)
        ),
      });

      const allAds = await db.query.companyAds.findMany({
        where: eq(schema.companyAds.companyId, id),
      });

      return {
        totalShops: shops.length,
        activeAds: enabledAds.length,
        totalAds: allAds.length,
      };
    }
  );
};
