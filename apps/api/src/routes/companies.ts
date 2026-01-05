import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';

/**
 * Company routes.
 * Handles company-related endpoints for company admins.
 */
export const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get company details.
   * Requires company admin authentication.
   * 
   * @route GET /api/companies/:id
   * @returns Company details
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   * @throws {404} If company not found
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

      // Verify company admin has access to this company
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
   * Get barbershops for a company.
   * Requires company admin authentication.
   * 
   * @route GET /api/companies/:id/shops
   * @returns List of barbershops
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.get(
    '/companies/:id/shops',
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

      // Verify company admin has access to this company
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shops = await db.query.shops.findMany({
        where: eq(schema.shops.companyId, id),
        orderBy: (shops, { asc }) => [asc(shops.name)],
      });

      return shops;
    }
  );

  /**
   * Get company dashboard data.
   * Requires company admin authentication.
   * 
   * @route GET /api/companies/:id/dashboard
   * @returns Dashboard statistics
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
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

      // Verify company admin has access to this company
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      // Get company shops count
      const shops = await db.query.shops.findMany({
        where: eq(schema.shops.companyId, id),
      });

      // Check for active ads
      const { existsSync } = await import('fs');
      const { join } = await import('path');
      const { fileURLToPath } = await import('url');
      const { dirname } = await import('path');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const companyAdsDir = join(__dirname, '..', '..', '..', 'web', 'public', 'companies', String(id));
      
      const ad1Exists = existsSync(join(companyAdsDir, 'gt-ad.png'));
      const ad2Exists = existsSync(join(companyAdsDir, 'gt-ad2.png'));
      const activeAdsCount = (ad1Exists ? 1 : 0) + (ad2Exists ? 1 : 0);

      return {
        totalShops: shops.length,
        activeAds: activeAdsCount,
        totalAds: 2,
      };
    }
  );
};

