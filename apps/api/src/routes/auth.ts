import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';

/**
 * Auth routes.
 * PIN-based authentication that issues JWT tokens.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Verify shop PIN and issue JWT token.
   * 
   * @route POST /api/shops/:slug/auth
   * @param slug - Shop slug identifier
   * @body pin - Owner or staff PIN
   * @returns { valid: boolean, role: string, token?: string }
   */
  fastify.post('/shops/:slug/auth', async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
    });
    const bodySchema = z.object({
      pin: z.string().min(1),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { pin } = validateRequest(bodySchema, request.body);

    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, slug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    let role: 'owner' | 'staff' | null = null;

    // Check owner PIN first
    if (shop.ownerPin === pin) {
      role = 'owner';
    } else if (shop.staffPin === pin) {
      // Check staff PIN
      role = 'staff';
    }

    if (!role) {
      return { valid: false, role: null };
    }

    // Issue JWT token
    const token = signToken({
      userId: shop.id, // Using shop ID as user ID for now (no separate user table)
      shopId: shop.id,
      role,
    });

    return {
      valid: true,
      role,
      token,
    };
  });
};

