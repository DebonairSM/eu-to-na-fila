import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, or } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
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

    // Get services for this shop
    const services = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
      orderBy: (services, { asc }) => [asc(services.name)],
    });

    return services;
  });

  /**
   * Create a new service for a shop.
   * Requires owner authentication (only owners can create services).
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
   * @throws {403} If not owner
   * @throws {404} If shop not found
   */
  fastify.post('/shops/:slug/services', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(500).optional(),
      duration: z.number().int().positive(),
      price: z.number().int().positive().optional(),
      isActive: z.boolean().default(true),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    // Create service
    const [newService] = await db
      .insert(schema.services)
      .values({
        shopId: shop.id,
        name: body.name,
        description: body.description || null,
        duration: body.duration,
        price: body.price || null,
        isActive: body.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Seed barber_service_weekday_stats rows (7 days x each barber)
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

    return reply.status(201).send(newService);
  });

  /**
   * Update a service's details.
   * Requires owner authentication (only owners can modify services).
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
   * @throws {403} If not owner
   * @throws {404} If service not found
   */
  fastify.patch('/services/:id', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(500).optional().nullable(),
      duration: z.number().int().positive().optional(),
      price: z.number().int().positive().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    // Get service
    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, id),
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
    }

    // Build update object
    const updateData: {
      name?: string;
      description?: string | null;
      duration?: number;
      price?: number | null;
      isActive?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.description !== undefined) {
      updateData.description = body.description;
    }
    if (body.duration !== undefined) {
      updateData.duration = body.duration;
    }
    if (body.price !== undefined) {
      updateData.price = body.price;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    // Update service
    const [updatedService] = await db
      .update(schema.services)
      .set(updateData)
      .where(eq(schema.services.id, id))
      .returning();

    return updatedService;
  });

  /**
   * Delete a service.
   * Requires owner authentication (only owners can delete services).
   * 
   * @route DELETE /api/services/:id
   * @param id - Service ID
   * @returns Success message
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   * @throws {404} If service not found
   * @throws {409} If any tickets (active or past) reference this service
   */
  fastify.delete('/services/:id', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });

    const { id } = validateRequest(paramsSchema, request.params);

    // Get service
    const service = await db.query.services.findFirst({
      where: eq(schema.services.id, id),
    });

    if (!service) {
      throw new NotFoundError(`Service with ID ${id} not found`);
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

