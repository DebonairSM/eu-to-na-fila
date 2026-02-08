import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { getProjectBySlug } from '../lib/shop.js';
import { hashPin } from '../lib/pin.js';
import { env } from '../env.js';

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

      // Count enabled ads from database
      const enabledAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, id),
          eq(schema.companyAds.enabled, true)
        ),
      });

      // Count all ads (enabled and disabled)
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

      const projectSlug = env.PROJECT_SLUG ?? env.SHOP_SLUG;
      const project = await getProjectBySlug(projectSlug);
      if (!project) {
        throw new ValidationError(`Project "${projectSlug}" not found`, [
          { field: 'project', message: 'Default project must exist. Run seed or create project first.' },
        ]);
      }

      // Check if slug already exists within this project
      let existingShop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.projectId, project.id),
          eq(schema.shops.slug, slug)
        ),
      });

      if (existingShop) {
        let counter = 1;
        let uniqueSlug = `${slug}-${counter}`;
        while (await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.projectId, project.id),
            eq(schema.shops.slug, uniqueSlug)
          ),
        })) {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }
        slug = uniqueSlug;
      }

      const [newShop] = await db
        .insert(schema.shops)
        .values({
          projectId: project.id,
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

      if (body.slug && body.slug !== shop.slug) {
        const existingShop = await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.projectId, shop.projectId),
            eq(schema.shops.slug, body.slug)
          ),
        });

        if (existingShop) {
          throw new ValidationError('Slug already exists', [
            { field: 'slug', message: 'This slug is already in use in this project' },
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

  /**
   * Create a full shop with services and barbers in a single transaction.
   * Requires company admin authentication.
   *
   * @route POST /api/companies/:id/shops/full
   * @returns Created shop, services, and barbers
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   * @throws {400} If validation fails
   */
  fastify.post(
    '/companies/:id/shops/full',
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

      const bodySchema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional(),
        theme: z.object({
          primary: z.string(),
          accent: z.string(),
        }).optional(),
        ownerPin: z.string().min(4).max(6).regex(/^\d+$/),
        staffPin: z.string().min(4).max(6).regex(/^\d+$/),
        services: z.array(z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(500).optional(),
          duration: z.number().int().positive(),
          price: z.number().int().nonnegative().optional(),
        })).min(1),
        barbers: z.array(z.object({
          name: z.string().min(1).max(100),
          email: z.string().email().optional().or(z.literal('')),
          phone: z.string().optional().or(z.literal('')),
        })).min(1),
      });

      const body = validateRequest(bodySchema, request.body);

      // Generate slug from name if not provided
      let slug = body.slug;
      if (!slug) {
        slug = body.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
      }

      const projectSlug = env.PROJECT_SLUG ?? env.SHOP_SLUG;
      const project = await getProjectBySlug(projectSlug);
      if (!project) {
        throw new ValidationError(`Project "${projectSlug}" not found`, [
          { field: 'project', message: 'Default project must exist. Run seed or create project first.' },
        ]);
      }

      // Ensure slug uniqueness
      let existingShop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.projectId, project.id),
          eq(schema.shops.slug, slug)
        ),
      });

      if (existingShop) {
        let counter = 1;
        let uniqueSlug = `${slug}-${counter}`;
        while (await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.projectId, project.id),
            eq(schema.shops.slug, uniqueSlug)
          ),
        })) {
          counter++;
          uniqueSlug = `${slug}-${counter}`;
        }
        slug = uniqueSlug;
      }

      // Hash PINs
      const ownerPinHash = await hashPin(body.ownerPin);
      const staffPinHash = await hashPin(body.staffPin);

      // Create everything in a transaction
      const result = await db.transaction(async (tx) => {
        const [newShop] = await tx
          .insert(schema.shops)
          .values({
            projectId: project.id,
            companyId: id,
            slug,
            name: body.name,
            domain: body.domain || null,
            path: null,
            apiBase: null,
            theme: body.theme ? JSON.stringify(body.theme) : null,
            ownerPinHash,
            staffPinHash,
            ownerPinResetRequired: false,
            staffPinResetRequired: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const newServices = await tx
          .insert(schema.services)
          .values(
            body.services.map((s) => ({
              shopId: newShop.id,
              name: s.name,
              description: s.description || null,
              duration: s.duration,
              price: s.price ?? null,
              isActive: true,
            }))
          )
          .returning();

        const newBarbers = await tx
          .insert(schema.barbers)
          .values(
            body.barbers.map((b) => ({
              shopId: newShop.id,
              name: b.name,
              email: b.email || null,
              phone: b.phone || null,
              isActive: true,
              isPresent: true,
            }))
          )
          .returning();

        return { shop: newShop, services: newServices, barbers: newBarbers };
      });

      return reply.status(201).send(result);
    }
  );
};

