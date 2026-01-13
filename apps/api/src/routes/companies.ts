import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
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
      const companyAdsDir = join(__dirname, '..', '..', 'public', 'companies', String(id));
      
      // Check for ad files with any supported extension
      const adExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
      const ad1Exists = adExtensions.some(ext => existsSync(join(companyAdsDir, `gt-ad${ext}`)));
      const ad2Exists = adExtensions.some(ext => existsSync(join(companyAdsDir, `gt-ad2${ext}`)));
      const activeAdsCount = (ad1Exists ? 1 : 0) + (ad2Exists ? 1 : 0);

      return {
        totalShops: shops.length,
        activeAds: activeAdsCount,
        totalAds: 2,
      };
    }
  );

  /**
   * Create a new shop for a company.
   * Requires company admin authentication.
   * 
   * @route POST /api/companies/:id/shops
   * @returns Created shop
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   * @throws {400} If validation fails or slug already exists
   */
  fastify.post(
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

      const bodySchema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional(),
        path: z.string().optional(),
        apiBase: z.string().url().optional(),
      });

      const body = validateRequest(bodySchema, request.body);

      // Generate slug from name if not provided
      let slug = body.slug;
      if (!slug) {
        slug = body.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
          .substring(0, 50); // Limit length
      }

      // Check if slug already exists
      const existingShop = await db.query.shops.findFirst({
        where: eq(schema.shops.slug, slug),
      });

      if (existingShop) {
        // If slug exists, append a number
        let counter = 1;
        let uniqueSlug = `${slug}-${counter}`;
        while (await db.query.shops.findFirst({ where: eq(schema.shops.slug, uniqueSlug) })) {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }
        slug = uniqueSlug;
      }

      // Create shop
      const [newShop] = await db
        .insert(schema.shops)
        .values({
          companyId: id,
          slug,
          name: body.name,
          domain: body.domain || null,
          path: body.path || null,
          apiBase: body.apiBase || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return reply.status(201).send(newShop);
    }
  );

  /**
   * Update a shop.
   * Requires company admin authentication.
   * 
   * @route PATCH /api/companies/:id/shops/:shopId
   * @returns Updated shop
   * @throws {401} If not authenticated
   * @throws {403} If not company admin or shop doesn't belong to company
   * @throws {404} If shop not found
   */
  fastify.patch(
    '/companies/:id/shops/:shopId',
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
        shopId: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id, shopId } = validateRequest(paramsSchema, request.params);

      // Verify company admin has access to this company
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const bodySchema = z.object({
        name: z.string().min(1).max(200).optional(),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional().nullable(),
        path: z.string().optional().nullable(),
        apiBase: z.string().url().optional().nullable(),
      });

      const body = validateRequest(bodySchema, request.body);

      // Get shop and verify it belongs to the company
      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });

      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      // Check if slug is being changed and if it already exists
      if (body.slug && body.slug !== shop.slug) {
        const existingShop = await db.query.shops.findFirst({
          where: eq(schema.shops.slug, body.slug),
        });

        if (existingShop) {
          throw new ValidationError('Slug already exists', [
            { field: 'slug', message: 'This slug is already in use' },
          ]);
        }
      }

      // Update shop
      const [updatedShop] = await db
        .update(schema.shops)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.slug && { slug: body.slug }),
          ...(body.domain !== undefined && { domain: body.domain }),
          ...(body.path !== undefined && { path: body.path }),
          ...(body.apiBase !== undefined && { apiBase: body.apiBase }),
          updatedAt: new Date(),
        })
        .where(eq(schema.shops.id, shopId))
        .returning();

      return updatedShop;
    }
  );

  /**
   * Delete a shop.
   * Requires company admin authentication.
   * 
   * @route DELETE /api/companies/:id/shops/:shopId
   * @returns Success message
   * @throws {401} If not authenticated
   * @throws {403} If not company admin or shop doesn't belong to company
   * @throws {404} If shop not found
   */
  fastify.delete(
    '/companies/:id/shops/:shopId',
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
        shopId: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id, shopId } = validateRequest(paramsSchema, request.params);

      // Verify company admin has access to this company
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      // Get shop and verify it belongs to the company
      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });

      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      // Delete shop (cascade will handle related records)
      await db.delete(schema.shops).where(eq(schema.shops.id, shopId));

      return reply.status(200).send({
        success: true,
        message: 'Shop deleted successfully',
      });
    }
  );
};

