import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Barber routes.
 * Handles barber listing and presence management.
 */
export const barberRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get all barbers for a shop.
   * 
   * @route GET /api/shops/:slug/barbers
   * @param slug - Shop slug identifier
   * @returns Array of barbers
   * @throws {404} If shop not found
   */
  fastify.get('/shops/:slug/barbers', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Get barbers for this shop, sorted by ID for consistent ordering
    const barbers = await db.query.barbers.findMany({
      where: eq(schema.barbers.shopId, shop.id),
      orderBy: (barbers, { asc }) => [asc(barbers.id)],
    });

    return barbers;
  });

  /**
   * Toggle barber presence.
   * When setting isPresent to false, unassigns any customer currently being served.
   * Requires staff or owner authentication.
   * 
   * @route PATCH /api/barbers/:id/presence
   * @param id - Barber ID
   * @body isPresent - Whether the barber is present
   * @returns Updated barber
   * @throws {401} If not authenticated
   * @throws {404} If barber not found
   */
  fastify.patch('/barbers/:id/presence', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      isPresent: z.boolean(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const { isPresent } = validateRequest(bodySchema, request.body);

    // Get barber
    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    if (!barber) {
      throw new NotFoundError(`Barber with ID ${id} not found`);
    }

    // If marking as not present, unassign any in-progress tickets
    if (!isPresent) {
      await db
        .update(schema.tickets)
        .set({ 
          barberId: null,
          status: 'waiting',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.tickets.barberId, id),
            eq(schema.tickets.status, 'in_progress')
          )
        );
    }

    // Update barber presence
    const [updatedBarber] = await db
      .update(schema.barbers)
      .set({ 
        isPresent,
        updatedAt: new Date(),
      })
      .where(eq(schema.barbers.id, id))
      .returning();

    return updatedBarber;
  });

  /**
   * Update a barber's details.
   * Requires owner authentication (only owners can modify barber details).
   * 
   * @route PATCH /api/barbers/:id
   * @param id - Barber ID
   * @body name - Optional barber name
   * @body avatarUrl - Optional avatar URL
   * @returns Updated barber
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   * @throws {404} If barber not found
   */
  fastify.patch('/barbers/:id', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatarUrl: z.string().url().optional().nullable(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    // Get barber
    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    if (!barber) {
      throw new NotFoundError(`Barber with ID ${id} not found`);
    }

    // Build update object
    const updateData: { name?: string; avatarUrl?: string | null; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl;
    }

    // Update barber
    const [updatedBarber] = await db
      .update(schema.barbers)
      .set(updateData)
      .where(eq(schema.barbers.id, id))
      .returning();

    return updatedBarber;
  });

  /**
   * Create a new barber for a shop.
   * Requires owner authentication (only owners can create barbers).
   * 
   * @route POST /api/shops/:slug/barbers
   * @param slug - Shop slug identifier
   * @body name - Barber name
   * @body avatarUrl - Optional avatar URL
   * @returns Created barber
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   * @throws {404} If shop not found
   */
  fastify.post('/shops/:slug/barbers', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const bodySchema = z.object({
      name: z.string().min(1).max(100),
      avatarUrl: z.string().url().optional().nullable(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { name, avatarUrl } = validateRequest(bodySchema, request.body);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    // Create barber
    const [newBarber] = await db
      .insert(schema.barbers)
      .values({
        shopId: shop.id,
        name,
        avatarUrl: avatarUrl || null,
        isPresent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newBarber;
  });

  /**
   * Delete a barber.
   * Requires owner authentication (only owners can delete barbers).
   * 
   * @route DELETE /api/barbers/:id
   * @param id - Barber ID
   * @returns Success message
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   * @throws {404} If barber not found
   */
  fastify.delete('/barbers/:id', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });

    const { id } = validateRequest(paramsSchema, request.params);

    // Get barber
    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    if (!barber) {
      throw new NotFoundError(`Barber with ID ${id} not found`);
    }

    // Unassign any tickets assigned to this barber
    await db
      .update(schema.tickets)
      .set({ 
        barberId: null,
        status: 'waiting',
        updatedAt: new Date(),
      })
      .where(eq(schema.tickets.barberId, id));

    // Delete barber
    await db
      .delete(schema.barbers)
      .where(eq(schema.barbers.id, id));

    return { success: true, message: 'Barber deleted successfully' };
  });
};

