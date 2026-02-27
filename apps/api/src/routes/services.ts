import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, asc, desc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';

/**
 * Service routes.
 * Handles service listing and management.
 */
export const serviceRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all services for a shop.
   * 
   * @route GET /api/shops/:slug/services
   * @param slug - Shop slug identifier
   * @returns Array of services
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/services', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');

    // Get services for this shop (ordered by sortOrder then id). Use query builder
    // so orderBy is reliable; fallback if sort_order column is missing (migration not run).
    let services;
    try {
      services = await db
        .select()
        .from(schema.services)
        .where(eq(schema.services.shopId, shop.id))
        .orderBy(asc(schema.services.sortOrder), asc(schema.services.id));
    } catch (err: unknown) {
      const msg = [err instanceof Error ? err.message : String(err), (err as { cause?: Error })?.cause?.message].filter(Boolean).join(' ');
      if (msg.includes('sort_order') || msg.includes('sortOrder')) {
        services = await db
          .select({
            id: schema.services.id,
            shopId: schema.services.shopId,
            name: schema.services.name,
            description: schema.services.description,
            duration: schema.services.duration,
            price: schema.services.price,
            isActive: schema.services.isActive,
            createdAt: schema.services.createdAt,
            updatedAt: schema.services.updatedAt,
          })
          .from(schema.services)
          .where(eq(schema.services.shopId, shop.id))
          .orderBy(asc(schema.services.id));
        services = services.map((s) => ({ ...s, sortOrder: 0, kind: 'complementary' as const }));
      } else {
        throw err;
      }
    }

    return services;
  });

  /**
   * Create a new service for a shop.
   * Requires owner or company_admin (company admins can manage services for their company's shops).
   *
   * @route POST /api/shops/:slug/services
   * @param slug - Shop slug identifier
   * @body name - Service name
   * @body description - Service description (optional)
   * @body duration - Duration in minutes
   * @body price - Price in cents (optional)
   * @body isActive - Whether service is active (default true)
   * @returns Created service
   * @throws {401} If not authenticated
   * @throws {403} If not owner or company admin for this shop
   * @throws {404} If shop not found
   */
  fastify.post('/shops/:slug/services', {
    preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      duration: z.number().int().positive(),
      price: z.number().int().min(0).optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().min(0).optional(),
      kind: z.enum(['main', 'complementary']).default('complementary'),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
    if (request.user?.role === 'company_admin' && (request.user.companyId == null || shop.companyId !== request.user.companyId)) {
      throw new ForbiddenError('Access denied to this shop');
    }

    // Resolve sortOrder: use body.sortOrder if provided, else max(sortOrder)+1 (fallback if sort_order missing)
    let sortOrder: number;
    if (body.sortOrder !== undefined) {
      sortOrder = body.sortOrder;
    } else {
      try {
        const maxResult = await db
          .select({ sortOrder: schema.services.sortOrder })
          .from(schema.services)
          .where(eq(schema.services.shopId, shop.id))
          .orderBy(desc(schema.services.sortOrder))
          .limit(1);
        sortOrder = (maxResult[0]?.sortOrder ?? -1) + 1;
      } catch {
        const existing = await db
          .select({ id: schema.services.id })
          .from(schema.services)
          .where(eq(schema.services.shopId, shop.id));
        sortOrder = existing.length;
      }
    }

    // If setting as main, clear main from any other service in this shop (one main per shop)
    if (body.kind === 'main') {
      await db
        .update(schema.services)
        .set({ kind: 'complementary', updatedAt: new Date() })
        .where(and(eq(schema.services.shopId, shop.id)));
    }

    const insertValues = {
      shopId: shop.id,
      name: body.name,
      description: body.description || null,
      duration: body.duration,
      price: body.price ?? null,
      isActive: body.isActive ?? true,
      sortOrder,
      kind: body.kind ?? 'complementary',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const returningColsCreate = {
      id: schema.services.id,
      shopId: schema.services.shopId,
      name: schema.services.name,
      description: schema.services.description,
      duration: schema.services.duration,
      price: schema.services.price,
      isActive: schema.services.isActive,
      kind: schema.services.kind,
      createdAt: schema.services.createdAt,
      updatedAt: schema.services.updatedAt,
    };

    let newService: { id: number; shopId: number; name: string; description: string | null; duration: number; price: number | null; isActive: boolean; sortOrder: number; kind: string; createdAt: Date; updatedAt: Date };
    try {
      const [row] = await db.insert(schema.services).values(insertValues).returning();
      newService = row ? { ...row, sortOrder: row.sortOrder ?? sortOrder } : null!;
    } catch (err: unknown) {
      const msg = [err instanceof Error ? err.message : String(err), (err as { cause?: Error })?.cause?.message].filter(Boolean).join(' ');
      if (!msg.includes('sort_order') && !msg.includes('sortOrder')) throw err;
      const { sortOrder: _o, ...valuesWithoutSortOrder } = insertValues;
      const [row] = await db.insert(schema.services).values(valuesWithoutSortOrder).returning(returningColsCreate);
      if (!row) throw new Error('Insert returned no row');
      newService = { ...row, sortOrder };
    }

    // Seed barber_service_weekday_stats rows (7 days x each barber). Non-fatal if table missing or insert fails.
    try {
      const shopBarbers = await db.query.barbers.findMany({
        where: eq(schema.barbers.shopId, shop.id),
      });
      if (shopBarbers.length > 0) {
        const now = new Date();
        const statsRows = shopBarbers.flatMap((barber) =>
          Array.from({ length: 7 }, (_, day) => ({
            barberId: barber.id,
            serviceId: newService.id,
            shopId: shop.id,
            dayOfWeek: day,
            avgDuration: 0,
            totalCompleted: 0,
            createdAt: now,
            updatedAt: now,
          }))
        );
        await db.insert(schema.barberServiceWeekdayStats).values(statsRows);
      }
    } catch (statsErr) {
      request.log.warn({ err: statsErr, shopId: shop.id, serviceId: newService.id }, 'Barber service weekday stats seed failed');
    }

    return reply.status(201).send(newService);
  });

  /**
   * Set display order of services for a shop.
   * Body is an array of service IDs in the desired order (first = sortOrder 0).
   * Requires owner or company_admin for this shop.
   *
   * @route POST /api/shops/:slug/services/reorder
   * @param slug - Shop slug identifier
   * @body ids - Array of service IDs in display order
   * @throws {401} If not authenticated
   * @throws {403} If not owner or company admin for this shop
   * @throws {404} If shop not found
   */
  fastify.post('/shops/:slug/services/reorder', {
    preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const bodySchema = z.object({
      ids: z.array(z.number().int().positive()),
    });
    const { slug } = validateRequest(paramsSchema, request.params);
    const { ids } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);
    if (request.user?.role === 'company_admin' && (request.user.companyId == null || shop.companyId !== request.user.companyId)) {
      throw new ForbiddenError('Access denied to this shop');
    }

    const now = new Date();
    try {
      for (let i = 0; i < ids.length; i++) {
        await db
          .update(schema.services)
          .set({ sortOrder: i, updatedAt: now })
          .where(and(eq(schema.services.id, ids[i]), eq(schema.services.shopId, shop.id)));
      }
    } catch (err: unknown) {
      const msg = [err instanceof Error ? err.message : String(err), (err as { cause?: Error })?.cause?.message].filter(Boolean).join(' ');
      if (msg.includes('sort_order') || msg.includes('sortOrder')) {
        // Column not yet migrated; reorder has no effect, succeed anyway
        return { ok: true };
      }
      throw err;
    }
    return { ok: true };
  });

  /**
   * Update a service's details.
   * Requires owner or company_admin for the service's shop.
   *
   * @route PATCH /api/services/:id
   * @param id - Service ID
   * @body name - Optional service name
   * @body description - Optional service description
   * @body duration - Optional duration in minutes
   * @body price - Optional price in cents
   * @body isActive - Optional active status
   * @returns Updated service
   * @throws {401} If not authenticated
   * @throws {403} If not owner or company admin for this shop
   * @throws {404} If service not found
   */
  fastify.patch('/services/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).optional().nullable(),
      duration: z.number().int().positive().optional(),
      price: z.number().int().min(0).optional().nullable(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().min(0).optional(),
      kind: z.enum(['main', 'complementary']).optional(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    // Get service and its shop for company_admin access check (omit sort_order so this works before migration 0022).
    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, id),
      columns: schema.serviceColumnsWithoutSortOrder,
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    if (request.user?.role === 'company_admin') {
      const shop = await db.query.shops.findFirst({
        where: eq(schema.shops.id, service.shopId),
        columns: { companyId: true },
      });
      if (request.user.companyId == null || !shop || shop.companyId !== request.user.companyId) {
        throw new ForbiddenError('Access denied to this shop');
      }
    }

    // If setting this service to main, clear main from any other service in this shop
    if (body.kind === 'main') {
      await db
        .update(schema.services)
        .set({ kind: 'complementary', updatedAt: new Date() })
        .where(and(eq(schema.services.shopId, service.shopId)));
    }

    const updateData: {
      name?: string;
      description?: string | null;
      duration?: number;
      price?: number | null;
      isActive?: boolean;
      sortOrder?: number;
      kind?: string;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.price !== undefined) updateData.price = body.price;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.kind !== undefined) updateData.kind = body.kind;

    const returningCols = {
      id: schema.services.id,
      shopId: schema.services.shopId,
      name: schema.services.name,
      description: schema.services.description,
      duration: schema.services.duration,
      price: schema.services.price,
      isActive: schema.services.isActive,
      kind: schema.services.kind,
      createdAt: schema.services.createdAt,
      updatedAt: schema.services.updatedAt,
    };

    try {
      const [row] = await db
        .update(schema.services)
        .set(updateData)
        .where(eq(schema.services.id, id))
        .returning(returningCols);
      if (!row) throw new NotFoundError(`Service with ID ${id} not found`);
      return { ...row, sortOrder: updateData.sortOrder ?? 0 };
    } catch (err: unknown) {
      const msg = [err instanceof Error ? err.message : String(err), (err as { cause?: Error })?.cause?.message].filter(Boolean).join(' ');
      if (!msg.includes('sort_order') && !msg.includes('sortOrder')) throw err;
      const { sortOrder: _omit, ...safeSet } = updateData;
      const [row] = await db
        .update(schema.services)
        .set(safeSet)
        .where(eq(schema.services.id, id))
        .returning(returningCols);
      if (!row) throw new NotFoundError(`Service with ID ${id} not found`);
      return { ...row, sortOrder: 0 };
    }
  });

  /**
   * Delete a service.
   * Requires owner or company_admin for the service's shop.
   *
   * @route DELETE /api/services/:id
   * @param id - Service ID
   * @returns Success message
   * @throws {401} If not authenticated
   * @throws {403} If not owner or company admin for this shop
   * @throws {404} If service not found
   * @throws {409} If any tickets (active or past) reference this service
   */
  fastify.delete('/services/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'company_admin'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });

    const { id } = validateRequest(paramsSchema, request.params);

    // Get service and its shop for company_admin access check
    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, id),
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    if (request.user?.role === 'company_admin') {
      const shop = await db.query.shops.findFirst({
        where: eq(schema.shops.id, service.shopId),
        columns: { companyId: true },
      });
      if (request.user.companyId == null || !shop || shop.companyId !== request.user.companyId) {
        throw new ForbiddenError('Access denied to this shop');
      }
    }

    // Block delete if any tickets (active or historical) reference this service
    const ticketsUsingService = await db.query.tickets.findMany({
      where: eq(schema.tickets.serviceId, id),
      limit: 1,
    });

    if (ticketsUsingService.length > 0) {
      throw new ConflictError(
        'Cannot delete a service that has been used by tickets (active or in the past). Deactivate the service instead so it no longer appears for new customers.'
      );
    }

    // Delete weekday stats for this service
    await db
      .delete(schema.barberServiceWeekdayStats)
      .where(eq(schema.barberServiceWeekdayStats.serviceId, id));

    // Delete service
    await db
      .delete(schema.services)
      .where(eq(schema.services.id, id));

    return { success: true, message: 'Service deleted successfully' };
  });
};

