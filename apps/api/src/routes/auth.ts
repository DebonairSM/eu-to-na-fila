import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/**
 * Auth routes.
 * Simple PIN-based authentication for shop owners.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Verify shop owner PIN.
   * 
   * @route POST /api/shops/:slug/auth
   * @param slug - Shop slug identifier
   * @body pin - Owner PIN
   * @returns { valid: boolean }
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

    // Check owner PIN first
    if (shop.ownerPin === pin) {
      return { valid: true, role: 'owner' };
    }
    
    // Check staff PIN
    if (shop.staffPin === pin) {
      return { valid: true, role: 'staff' };
    }

    return { valid: false, role: null };
  });
};

