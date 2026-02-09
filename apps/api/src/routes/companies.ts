import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { hashPin } from '../lib/pin.js';
import { mergeHomeContent } from '../lib/homeContent.js';

const themeSchema = z.object({
  primary: z.string().max(50).optional(),
  accent: z.string().max(50).optional(),
  background: z.string().max(50).optional(),
  surfacePrimary: z.string().max(50).optional(),
  surfaceSecondary: z.string().max(50).optional(),
  navBg: z.string().max(50).optional(),
  textPrimary: z.string().max(100).optional(),
  textSecondary: z.string().max(100).optional(),
  borderColor: z.string().max(100).optional(),
}).optional();

const homeContentSchema = z.object({
  hero: z.object({
    badge: z.string().max(500).optional(),
    subtitle: z.string().max(500).optional(),
    ctaJoin: z.string().max(100).optional(),
    ctaLocation: z.string().max(100).optional(),
  }).optional(),
  nav: z.object({
    linkServices: z.string().max(100).optional(),
    linkAbout: z.string().max(100).optional(),
    linkLocation: z.string().max(100).optional(),
    ctaJoin: z.string().max(100).optional(),
    linkBarbers: z.string().max(100).optional(),
    labelDashboard: z.string().max(100).optional(),
    labelDashboardCompany: z.string().max(100).optional(),
    labelLogout: z.string().max(100).optional(),
    labelMenu: z.string().max(100).optional(),
  }).optional(),
  services: z.object({
    sectionTitle: z.string().max(200).optional(),
    loadingText: z.string().max(200).optional(),
    emptyText: z.string().max(200).optional(),
  }).optional(),
  about: z.object({
    sectionTitle: z.string().max(200).optional(),
    imageUrl: z.string().url().max(1000).optional().or(z.literal('')),
    imageAlt: z.string().max(200).optional(),
    features: z.array(z.object({
      icon: z.string().max(50),
      text: z.string().max(500),
    })).optional(),
  }).optional(),
  location: z.object({
    sectionTitle: z.string().max(200).optional(),
    labelAddress: z.string().max(100).optional(),
    labelHours: z.string().max(100).optional(),
    labelPhone: z.string().max(100).optional(),
    labelLanguages: z.string().max(100).optional(),
    linkMaps: z.string().max(100).optional(),
    address: z.string().max(500).optional(),
    addressLink: z.string().url().max(1000).optional().or(z.literal('')),
    hours: z.string().max(500).optional(),
    phone: z.string().max(50).optional(),
    phoneHref: z.string().max(100).optional(),
    languages: z.string().max(200).optional(),
    mapQuery: z.string().max(500).optional(),
  }).optional(),
  accessibility: z.object({
    skipLink: z.string().max(200).optional(),
    loading: z.string().max(200).optional(),
  }).optional(),
}).optional();

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

      // Ensure project slug is globally unique (projects.slug is unique)
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
        theme: themeSchema,
        homeContent: homeContentSchema,
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

      // Update shop
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

      // Delete shop and all related records in a transaction.
      // Order matters: delete children before parents to respect FK constraints.
      await db.transaction(async (tx) => {
        // 1. Audit log (references shop + ticket)
        await tx.delete(schema.auditLog).where(eq(schema.auditLog.shopId, shopId));
        // 2. Tickets (references shop, service, barber)
        await tx.delete(schema.tickets).where(eq(schema.tickets.shopId, shopId));
        // 3. Services (references shop)
        await tx.delete(schema.services).where(eq(schema.services.shopId, shopId));
        // 4. Barbers (references shop)
        await tx.delete(schema.barbers).where(eq(schema.barbers.shopId, shopId));
        // 5. Company ads linked to this shop (nullable FK, set to null or delete)
        await tx.delete(schema.companyAds).where(eq(schema.companyAds.shopId, shopId));
        // 6. Shop itself
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
        ownerPin: z.string().min(4).max(12).regex(/^\d+$/).optional(),
        staffPin: z.string().min(4).max(12).regex(/^\d+$/).optional(),
        theme: themeSchema,
        homeContent: homeContentSchema,
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

      // Ensure project slug is globally unique (projects.slug is unique)
      let projectSlug = slug;
      let counter = 0;
      while (await db.query.projects.findFirst({ where: eq(schema.projects.slug, projectSlug) })) {
        counter++;
        projectSlug = `${slug}-${counter}`;
      }
      if (counter > 0) slug = projectSlug;

      // Hash PINs (defaults: owner 1234, staff 0000)
      const ownerPin = body.ownerPin ?? '1234';
      const staffPin = body.staffPin ?? '0000';
      const ownerPinHash = await hashPin(ownerPin);
      const staffPinHash = await hashPin(staffPin);

      // Create project + shop + services + barbers in a transaction
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

        const defaultTheme = { primary: '#3E2723', accent: '#FFD54F', background: '#0a0a0a', surfacePrimary: '#0a0a0a', surfaceSecondary: '#1a1a1a', navBg: '#0a0a0a', textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.08)' };
        const themeToStore = body.theme ? { ...defaultTheme, ...body.theme } : defaultTheme;
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

