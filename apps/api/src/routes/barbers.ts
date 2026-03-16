import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, asc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { getShopBySlug, getShopById } from '../lib/shop.js';
import { parseSettings } from '../lib/settings.js';
import { getBarberPresenceWindow } from '@eutonafila/shared';
import { ticketService } from '../services/index.js';
import { hashPassword, validatePassword } from '../lib/password.js';

/** Normalize username for storage (trim + lowercase) for case-insensitive login. */
function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/** Normalize email for storage and lookup (trim + lowercase). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Validate barber username format. */
function validateBarberUsername(username: string): { isValid: boolean; error?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 1) return { isValid: false, error: 'Username is required' };
  if (trimmed.length > 100) return { isValid: false, error: 'Username must be at most 100 characters' };
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return { isValid: false, error: 'Username can only contain letters, numbers, underscore, hyphen and period' };
  return { isValid: true };
}

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
  fastify.get('/shops/:slug/barbers', {
    preHandler: [optionalAuth()],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    reply.header('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');

    const settings = parseSettings(shop.settings);
    const timezone = settings.timezone ?? 'America/Sao_Paulo';
    const { shouldAutoAbsent } = getBarberPresenceWindow(
      settings.operatingHours,
      timezone,
      new Date(),
      settings.temporaryStatusOverride ?? undefined
    );
    if (shouldAutoAbsent) {
      await db
        .update(schema.barbers)
        .set({ isPresent: false, updatedAt: new Date() })
        .where(eq(schema.barbers.shopId, shop.id));
    }

    // Get barbers for this shop, sorted by ID for consistent ordering (omit passwordHash)
    const barbers = await db.query.barbers.findMany({
      where: eq(schema.barbers.shopId, shop.id),
      orderBy: (b, { asc }) => [asc(b.id)],
      columns: {
        id: true,
        shopId: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        username: true,
        isActive: true,
        isPresent: true,
        revenueSharePercent: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isBarberCaller = request.user?.role === 'barber';
    const hideRevenueFromBarbers = isBarberCaller && settings.barbersCanSeeProfits === false;

    if (hideRevenueFromBarbers) {
      return barbers.map(({ revenueSharePercent: _, ...rest }) => rest);
    }
    return barbers;
  });

  /**
   * Toggle barber presence.
   * Barbers are never automatically marked present when the shop reopens; only explicit staff action sets isPresent to true.
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
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      isPresent: z.boolean(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const { isPresent } = validateRequest(bodySchema, request.body);

    if (request.user?.role === 'barber' && request.user.barberId !== id) {
      throw new ValidationError('Barbers can only update their own presence');
    }

    // Get barber
    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    if (!barber) {
      throw new NotFoundError(`Barber with ID ${id} not found`);
    }

    const shop = await getShopById(barber.shopId);
    if (shop) {
      const settings = parseSettings(shop.settings);
      const timezone = settings.timezone ?? 'America/Sao_Paulo';
      const { canMarkPresent, shouldAutoAbsent } = getBarberPresenceWindow(
        settings.operatingHours,
        timezone,
        new Date(),
        settings.temporaryStatusOverride ?? undefined
      );
      if (shouldAutoAbsent) {
        await db
          .update(schema.barbers)
          .set({ isPresent: false, updatedAt: new Date() })
          .where(eq(schema.barbers.shopId, barber.shopId));
      }
      if (isPresent && !canMarkPresent) {
        throw new ValidationError(
          'Barbers cannot mark themselves present at or after shop closing time'
        );
      }
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
   * Update a barber's active status (available for queue / on break).
   * When a barber goes inactive, tickets with that preferred barber are recalculated
   * into the general line; when they go active again, those tickets go back to that barber's line.
   * Requires staff or owner authentication.
   * 
   * @route PATCH /api/barbers/:id/status
   * @param id - Barber ID
   * @body isActive - Whether the barber is active (available for queue)
   * @returns Updated barber
   * @throws {401} If not authenticated
   * @throws {404} If barber not found
   */
  fastify.patch('/barbers/:id/status', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      isActive: z.boolean(),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const { isActive } = validateRequest(bodySchema, request.body);

    if (request.user?.role === 'barber' && request.user.barberId !== id) {
      throw new ValidationError('Barbers can only update their own status');
    }

    const barber = await db.query.barbers.findFirst({
      where: eq(schema.barbers.id, id),
    });

    if (!barber) {
      throw new NotFoundError(`Barber with ID ${id} not found`);
    }

    const [updatedBarber] = await db
      .update(schema.barbers)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(schema.barbers.id, id))
      .returning();

    // Recalculate positions and wait times so preferred-barber tickets move to/from general line
    await ticketService.recalculateShopQueue(barber.shopId);

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
      email: z.string().max(255).optional().nullable(),
      phone: z.string().max(50).optional().nullable(),
      username: z.string().min(1).max(100).optional().nullable(),
      password: z.string().min(1).max(200).optional(),
      revenueSharePercent: z.number().int().min(0).max(100).nullable().optional(),
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

    // Resolve final username and email after update for validation
    const nextUsername = body.username !== undefined
      ? (body.username === null || body.username === '' ? null : normalizeUsername(body.username))
      : barber.username;
    const nextEmail = body.email !== undefined
      ? (body.email === null || body.email === '' ? null : normalizeEmail(body.email))
      : barber.email;
    if (nextUsername && !nextEmail) {
      throw new ValidationError('Email is required when barber has login credentials (username)');
    }
    if (body.email !== undefined && body.email !== null && body.email.trim() !== '') {
      const emailParsed = z.string().email().safeParse(body.email.trim());
      if (!emailParsed.success) throw new ValidationError('Invalid email format');
    }

    // Build update object
    const updateData: {
      name?: string;
      avatarUrl?: string | null;
      email?: string | null;
      phone?: string | null;
      username?: string | null;
      passwordHash?: string | null;
      revenueSharePercent?: number | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl;
    }
    if (body.email !== undefined) {
      updateData.email = body.email === null || body.email === '' ? null : normalizeEmail(body.email);
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone === null || body.phone === '' ? null : body.phone.trim();
    }
    if (body.revenueSharePercent !== undefined) {
      updateData.revenueSharePercent = body.revenueSharePercent;
    }
    if (body.username !== undefined) {
      if (body.username === null || body.username === '') {
        updateData.username = null;
        updateData.passwordHash = null; // Clear login when clearing username
      } else {
        const unValidation = validateBarberUsername(body.username);
        if (!unValidation.isValid) throw new ValidationError(unValidation.error);
        updateData.username = normalizeUsername(body.username);
      }
    }
    if (body.password !== undefined && body.password !== '') {
      const pwValidation = validatePassword(body.password);
      if (!pwValidation.isValid) throw new ValidationError(pwValidation.error);
      updateData.passwordHash = await hashPassword(body.password);
    }

    // Update barber
    const [updatedBarber] = await db
      .update(schema.barbers)
      .set(updateData)
      .where(eq(schema.barbers.id, id))
      .returning();

    if (!updatedBarber) throw new NotFoundError(`Barber with ID ${id} not found`);
    const { passwordHash: _ph, ...safe } = updatedBarber;
    return safe;
  });

  /**
   * Set or update a barber's password (owner only).
   *
   * @route POST /api/shops/:slug/barbers/:id/set-password
   * @body password - New password
   */
  fastify.post('/shops/:slug/barbers/:id/set-password', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const bodySchema = z.object({
      password: z.string().min(1).max(200),
    });

    const { slug, id } = validateRequest(paramsSchema, request.params);
    const { password } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const barber = await db.query.barbers.findFirst({
      where: and(eq(schema.barbers.id, id), eq(schema.barbers.shopId, shop.id)),
    });
    if (!barber) throw new NotFoundError(`Barber with ID ${id} not found`);

    const pwValidation = validatePassword(password);
    if (!pwValidation.isValid) throw new ValidationError(pwValidation.error);

    const passwordHash = await hashPassword(password);
    await db
      .update(schema.barbers)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(schema.barbers.id, id));

    return { success: true, message: 'Password updated' };
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
      email: z.string().max(255).optional().nullable(),
      phone: z.string().max(50).optional().nullable(),
      username: z.string().min(1).max(100).optional(),
      password: z.string().min(1).max(200).optional(),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);
    const { name, avatarUrl, email, phone, username, password } = body;

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    let usernameNormalized: string | null = null;
    let passwordHash: string | null = null;
    let emailNormalized: string | null = null;
    if (username !== undefined && username !== '') {
      const unValidation = validateBarberUsername(username);
      if (!unValidation.isValid) throw new ValidationError(unValidation.error);
      usernameNormalized = normalizeUsername(username);
      if (password === undefined || password === '') {
        throw new ValidationError('Password is required when setting username');
      }
      const emailVal = email ?? null;
      if (!emailVal || !emailVal.trim()) {
        throw new ValidationError('Email is required when barber has login credentials (username)');
      }
      const emailParsed = z.string().email().safeParse(emailVal.trim());
      if (!emailParsed.success) {
        throw new ValidationError('Invalid email format');
      }
      emailNormalized = normalizeEmail(emailVal);
      const pwValidation = validatePassword(password);
      if (!pwValidation.isValid) throw new ValidationError(pwValidation.error);
      passwordHash = await hashPassword(password);
    } else if (password !== undefined && password !== '') {
      throw new ValidationError('Username is required when setting password');
    } else if (email !== undefined && email !== null && email.trim() !== '') {
      const emailParsed = z.string().email().safeParse(email.trim());
      if (emailParsed.success) emailNormalized = normalizeEmail(email);
    }

    // Create barber
    const [newBarber] = await db
      .insert(schema.barbers)
      .values({
        shopId: shop.id,
        name,
        avatarUrl: avatarUrl || null,
        email: emailNormalized,
        phone: phone?.trim() || null,
        username: usernameNormalized,
        passwordHash,
        isPresent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Seed barber_service_weekday_stats rows (7 days x each service)
    const shopServices = await db.query.services.findMany({
      where: eq(schema.services.shopId, shop.id),
    });
    if (shopServices.length > 0) {
      const now = new Date();
      const statsRows = shopServices.flatMap((svc) =>
        Array.from({ length: 7 }, (_, day) => ({
          barberId: newBarber.id,
          serviceId: svc.id,
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

    const { passwordHash: _ph, ...safe } = newBarber;
    return safe;
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

    // Delete weekday stats (also handled by CASCADE, but explicit for clarity)
    await db
      .delete(schema.barberServiceWeekdayStats)
      .where(eq(schema.barberServiceWeekdayStats.barberId, id));

    // Delete barber
    await db
      .delete(schema.barbers)
      .where(eq(schema.barbers.id, id));

    return { success: true, message: 'Barber deleted successfully' };
  });
};

