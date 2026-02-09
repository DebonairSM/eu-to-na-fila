import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { hashPin } from '../lib/pin.js';
import { mergeHomeContent } from '../lib/homeContent.js';
import { DEFAULT_THEME } from '../lib/theme.js';
import { themeInputSchema, homeContentInputSchema, shopSettingsInputSchema } from '@eutonafila/shared';

/**
 * Company shop routes.
 * Handles shop CRUD under /companies/:id/shops/*.
 */
export const companyShopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get barbershops for a company.
   * Requires company admin authentication.
   * 
   * @route GET /api/companies/:id/shops
   * @returns List of barbershops
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
   * Create a new shop for a company.
   * 
   * @route POST /api/companies/:id/shops
   * @returns Created shop
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
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
      }

      // Ensure project slug is globally unique
      let projectSlug = slug;
      let counter = 0;
      while (await db.query.projects.findFirst({ where: eq(schema.projects.slug, projectSlug) })) {
        counter++;
        projectSlug = `${slug}-${counter}`;
      }
      if (counter > 0) slug = projectSlug;

      const [newProject] = await db
        .insert(schema.projects)
        .values({
          slug: projectSlug,
          name: body.name,
          path: body.path || `/projects/${projectSlug}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      const [newShop] = await db
        .insert(schema.shops)
        .values({
          projectId: newProject.id,
          companyId: id,
          slug,
          name: body.name,
          domain: body.domain || null,
          path: body.path || `/projects/${projectSlug}`,
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
   * 
   * @route PATCH /api/companies/:id/shops/:shopId
   * @returns Updated shop
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
        theme: themeInputSchema,
        homeContent: homeContentInputSchema,
        settings: shopSettingsInputSchema,
      });

      const body = validateRequest(bodySchema, request.body);

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

      const updatePayload: Record<string, unknown> = {
        ...(body.name && { name: body.name }),
        ...(body.slug && { slug: body.slug }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.path !== undefined && { path: body.path }),
        ...(body.apiBase !== undefined && { apiBase: body.apiBase }),
        updatedAt: new Date(),
      };

      if (body.theme !== undefined) {
        const existingTheme = shop.theme ? (JSON.parse(shop.theme) as Record<string, string>) : {};
        updatePayload.theme = JSON.stringify({ ...existingTheme, ...body.theme });
      }

      if (body.homeContent !== undefined) {
        const existing = (shop.homeContent ?? {}) as Record<string, unknown>;
        const merged = mergeHomeContent({ ...existing, ...body.homeContent });
        updatePayload.homeContent = merged;
      }

      if (body.settings !== undefined) {
        const existing = (shop.settings ?? {}) as Record<string, unknown>;
        updatePayload.settings = { ...existing, ...body.settings };
      }

      const [updatedShop] = await db
        .update(schema.shops)
        .set(updatePayload as Record<string, unknown>)
        .where(eq(schema.shops.id, shopId))
        .returning();

      return updatedShop;
    }
  );

  /**
   * Delete a shop.
   * 
   * @route DELETE /api/companies/:id/shops/:shopId
   * @returns Success message
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

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });

      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      await db.transaction(async (tx) => {
        await tx.delete(schema.auditLog).where(eq(schema.auditLog.shopId, shopId));
        await tx.delete(schema.tickets).where(eq(schema.tickets.shopId, shopId));
        await tx.delete(schema.services).where(eq(schema.services.shopId, shopId));
        await tx.delete(schema.barbers).where(eq(schema.barbers.shopId, shopId));
        await tx.delete(schema.companyAds).where(eq(schema.companyAds.shopId, shopId));
        await tx.delete(schema.shops).where(eq(schema.shops.id, shopId));
      });

      return reply.status(200).send({
        success: true,
        message: 'Shop deleted successfully',
      });
    }
  );

  /**
   * Create a full shop with services and barbers in a single transaction.
   *
   * @route POST /api/companies/:id/shops/full
   * @returns Created shop, services, and barbers
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
        ownerPin: z.string().min(4).max(12).regex(/^\d+$/).optional(),
        staffPin: z.string().min(4).max(12).regex(/^\d+$/).optional(),
        theme: themeInputSchema,
        homeContent: homeContentInputSchema,
        settings: shopSettingsInputSchema,
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

      let projectSlug = slug;
      let counter = 0;
      while (await db.query.projects.findFirst({ where: eq(schema.projects.slug, projectSlug) })) {
        counter++;
        projectSlug = `${slug}-${counter}`;
      }
      if (counter > 0) slug = projectSlug;

      const ownerPin = body.ownerPin ?? '1234';
      const staffPin = body.staffPin ?? '0000';
      const ownerPinHash = await hashPin(ownerPin);
      const staffPinHash = await hashPin(staffPin);

      const result = await db.transaction(async (tx) => {
        const [newProject] = await tx
          .insert(schema.projects)
          .values({
            slug: projectSlug,
            name: body.name,
            path: `/projects/${projectSlug}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const themeToStore = body.theme ? { ...DEFAULT_THEME, ...body.theme } : DEFAULT_THEME;
        const homeContentToStore = body.homeContent ? mergeHomeContent(body.homeContent) : null;

        const [newShop] = await tx
          .insert(schema.shops)
          .values({
            projectId: newProject.id,
            companyId: id,
            slug,
            name: body.name,
            domain: body.domain || null,
            path: `/projects/${projectSlug}`,
            apiBase: null,
            theme: JSON.stringify(themeToStore),
            homeContent: homeContentToStore,
            settings: body.settings ?? null,
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
