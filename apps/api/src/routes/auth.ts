import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { verifyPin, validatePin } from '../lib/pin.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { logAuthFailure, logAuthSuccess, getClientIp } from '../middleware/security.js';

/**
 * Auth routes.
 * PIN-based authentication that issues JWT tokens.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Brute force protection: 5 attempts per 15 minutes per IP
  const authRateLimit = createRateLimit({
    max: 5,
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

    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

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
    });

    return {
      valid: true,
      role,
      token,
      pinResetRequired,
    };
  });
};

