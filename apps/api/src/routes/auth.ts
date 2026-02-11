import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { getShopBySlug } from '../lib/shop.js';
import { ValidationError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { verifyPassword, validatePassword } from '../lib/password.js';
import { getKioskPasswordHash } from '../lib/settings.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { logAuthFailure, logAuthSuccess, getClientIp } from '../middleware/security.js';

/**
 * Auth routes.
 * Owner/staff: password-based authentication. Barber: username + password.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Brute force protection: more lenient in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxAttempts = isDevelopment ? 100 : 30;

  const authRateLimit = createRateLimit({
    max: maxAttempts,
    timeWindow: '15 minutes',
    keyGenerator: (request) => {
      const ip = getClientIp(request);
      const slug = (request.params as { slug?: string })?.slug || 'unknown';
      return `${ip}:${slug}`;
    },
  });

  /**
   * Verify shop password (owner or staff) and issue JWT token.
   *
   * @route POST /api/shops/:slug/auth
   * @body password - Owner or staff password
   * @returns { valid, role, token?, pinResetRequired? }
   */
  fastify.post('/shops/:slug/auth', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { password } = validateRequest(bodySchema, request.body);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logAuthFailure(request, 'invalid_password_format', slug);
      throw new ValidationError(passwordValidation.error || 'Invalid password format');
    }

    const shop = await getShopBySlug(slug);

    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    let role: 'owner' | 'staff' | null = null;
    let passwordMatches = false;
    let pinResetRequired = false;

    if (shop.ownerPinHash) {
      const matches = await verifyPassword(password, shop.ownerPinHash);
      if (matches) {
        role = 'owner';
        passwordMatches = true;
        pinResetRequired = shop.ownerPinResetRequired || false;
      }
    } else if (shop.ownerPin === password) {
      role = 'owner';
      passwordMatches = true;
      pinResetRequired = true;
    }

    if (!passwordMatches && shop.staffPinHash) {
      const matches = await verifyPassword(password, shop.staffPinHash);
      if (matches) {
        role = 'staff';
        passwordMatches = true;
        pinResetRequired = shop.staffPinResetRequired || false;
      }
    } else if (!passwordMatches && shop.staffPin === password) {
      role = 'staff';
      passwordMatches = true;
      pinResetRequired = true;
    }

    if (!passwordMatches || !role) {
      logAuthFailure(request, 'invalid_password', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, role);

    const token = signToken({
      userId: shop.id,
      shopId: shop.id,
      role,
    } as { userId: number; shopId: number; role: 'owner' | 'staff' });

    return {
      valid: true,
      role,
      token,
      pinResetRequired,
    };
  });

  /**
   * Barber login: username + password. Issues JWT with role 'barber'.
   *
   * @route POST /api/shops/:slug/auth/barber
   * @body username - Barber username (unique per shop)
   * @body password - Barber password
   * @returns { valid, role: 'barber', token?, barberName?, pinResetRequired?: false }
   */
  fastify.post('/shops/:slug/auth/barber', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { username, password } = validateRequest(bodySchema, request.body);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logAuthFailure(request, 'invalid_password_format', slug);
      throw new ValidationError(passwordValidation.error || 'Invalid password format');
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    const usernameNormalized = username.trim().toLowerCase();
    const barber = await db.query.barbers.findFirst({
      where: and(
        eq(schema.barbers.shopId, shop.id),
        eq(schema.barbers.username, usernameNormalized)
      ),
    });

    if (!barber || !barber.passwordHash) {
      logAuthFailure(request, 'invalid_barber_login', slug);
      return { valid: false, role: null };
    }

    const passwordMatches = await verifyPassword(password, barber.passwordHash);
    if (!passwordMatches) {
      logAuthFailure(request, 'invalid_barber_login', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, 'barber');

    const token = signToken({
      userId: barber.id,
      shopId: barber.shopId,
      role: 'barber',
      barberId: barber.id,
    });

    return {
      valid: true,
      role: 'barber' as const,
      token,
      barberId: barber.id,
      barberName: barber.name,
      pinResetRequired: false,
    };
  });

  /**
   * Kiosk-only login: username + password from shop settings.
   * Issues JWT with role 'kiosk' for display-only queue/barber view.
   *
   * @route POST /api/shops/:slug/auth/kiosk
   * @body username - Kiosk username (from shop settings)
   * @body password - Kiosk password
   * @returns { valid, role: 'kiosk', token? }
   */
  fastify.post('/shops/:slug/auth/kiosk', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { username, password } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    const settings = shop.settings as Record<string, unknown> | null;
    const kioskUsername = settings?.kioskUsername;
    const kioskPasswordHash = getKioskPasswordHash(shop.settings);
    const kioskPasswordPlain = typeof settings?.kioskPassword === 'string' ? settings.kioskPassword : null;

    if (typeof kioskUsername !== 'string' || !kioskUsername.trim()) {
      logAuthFailure(request, 'invalid_kiosk_login', slug);
      return { valid: false, role: null };
    }

    const usernameMatch = username.trim() === kioskUsername.trim();
    let passwordMatches = false;
    if (kioskPasswordHash) {
      passwordMatches = await verifyPassword(password, kioskPasswordHash);
    } else if (kioskPasswordPlain) {
      passwordMatches = password === kioskPasswordPlain;
    }

    if (!usernameMatch || !passwordMatches) {
      logAuthFailure(request, 'invalid_kiosk_login', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, 'kiosk');

    const token = signToken({
      userId: shop.id,
      shopId: shop.id,
      role: 'kiosk',
    });

    return {
      valid: true,
      role: 'kiosk' as const,
      token,
    };
  });
};

