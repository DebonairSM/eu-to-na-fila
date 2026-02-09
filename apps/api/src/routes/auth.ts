import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { getShopBySlug } from '../lib/shop.js';
import { ValidationError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { verifyPin, validatePin } from '../lib/pin.js';
import { verifyPassword, validatePassword } from '../lib/password.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { logAuthFailure, logAuthSuccess, getClientIp } from '../middleware/security.js';

/**
 * Auth routes.
 * PIN-based authentication that issues JWT tokens.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Brute force protection: more lenient in development
  // In development: 100 attempts per 15 minutes (allows for testing)
  // In production: 30 attempts per 15 minutes (balanced security and usability)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxAttempts = isDevelopment ? 100 : 30;
  
  const authRateLimit = createRateLimit({
    max: maxAttempts,
    timeWindow: '15 minutes',
    keyGenerator: (request) => {
      const ip = getClientIp(request);
      const slug = (request.params as { slug?: string })?.slug || 'unknown';
      return `${ip}:${slug}`; // Rate limit per IP + shop combination
    },
  });

  /**
   * Verify shop PIN and issue JWT token.
   * 
   * @route POST /api/shops/:slug/auth
   * @param slug - Shop slug identifier
   * @body pin - Owner or staff PIN
   * @returns { valid: boolean, role: string, token?: string, pinResetRequired?: boolean }
   */
  fastify.post('/shops/:slug/auth', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      pin: z.string().min(1).max(20),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { pin } = validateRequest(bodySchema, request.body);

    // Validate PIN format
    const pinValidation = validatePin(pin);
    if (!pinValidation.isValid) {
      logAuthFailure(request, 'invalid_pin_format', slug);
      throw new ValidationError(pinValidation.error || 'Invalid PIN format');
    }

    const shop = await getShopBySlug(slug);

    if (!shop) {
      // Don't reveal that shop doesn't exist - same response as wrong PIN
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    let role: 'owner' | 'staff' | null = null;
    let pinMatches = false;
    let pinResetRequired = false;

    // Check owner PIN (hashed first, then legacy plain text)
    if (shop.ownerPinHash) {
      const matches = await verifyPin(pin, shop.ownerPinHash);
      if (matches) {
        role = 'owner';
        pinMatches = true;
        pinResetRequired = shop.ownerPinResetRequired || false;
      }
    } else if (shop.ownerPin === pin) {
      // Legacy plain text PIN support during migration
      role = 'owner';
      pinMatches = true;
      pinResetRequired = true; // Force reset for legacy PINs
    }

    // Check staff PIN if owner PIN didn't match
    if (!pinMatches && shop.staffPinHash) {
      const matches = await verifyPin(pin, shop.staffPinHash);
      if (matches) {
        role = 'staff';
        pinMatches = true;
        pinResetRequired = shop.staffPinResetRequired || false;
      }
    } else if (!pinMatches && shop.staffPin === pin) {
      // Legacy plain text PIN support during migration
      role = 'staff';
      pinMatches = true;
      pinResetRequired = true; // Force reset for legacy PINs
    }

    if (!pinMatches || !role) {
      logAuthFailure(request, 'invalid_pin', slug);
      return { valid: false, role: null };
    }

    // Log successful authentication
    logAuthSuccess(request, shop.id, role);

    // Issue JWT token
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
};

