import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getShopBySlug } from '../lib/shop.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { normalizeToHomeContentByLocale } from '../lib/homeContent.js';
import { parseResolvedStyle, parseTheme } from '../lib/theme.js';
import { parseSettings } from '../lib/settings.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/**
 * Shop routes.
 * Handles shop listing and public config.
 */
export const shopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get public shop config (name, theme, path, homeContent). No auth required.
   *
   * @route GET /api/shops/:slug/config
   * @returns { name, theme: { primary, accent, ... }, path, homeContent }
   */
  fastify.get('/shops/:slug/config', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const theme = parseTheme(shop.theme);
    const style = parseResolvedStyle(shop.theme);
    const homeContentByLocale = normalizeToHomeContentByLocale(shop.homeContent ?? null);
    const defaultLocale = homeContentByLocale['pt-BR'] ?? Object.values(homeContentByLocale)[0];

    const settings = parseSettings(shop.settings);

    return {
      name: shop.name,
      theme,
      style,
      path: shop.path ?? `/projects/${shop.slug}`,
      homeContentByLocale,
      homeContent: defaultLocale,
      settings,
    };
  });

  /**
   * Get all shops.
   * 
   * @route GET /api/shops
   * @returns Array of shops (public fields only)
   */
  fastify.get('/shops', async (request, reply) => {
    // Get all shops
    const shops = await db.query.shops.findMany({
      orderBy: (shops, { asc }) => [asc(shops.name)],
    });

    // Return only public fields (exclude sensitive data)
    return shops.map((shop) => ({
      id: shop.id,
      slug: shop.slug,
      name: shop.name,
      domain: shop.domain,
      createdAt: shop.createdAt,
    }));
  });

  /**
   * Set temporary shop status override (owner only).
   * Allows owner to manually open/close shop for a specified duration.
   * 
   * @route PATCH /api/shops/:slug/temporary-status
   * @auth Owner only
   */
  fastify.patch('/shops/:slug/temporary-status', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    
    const bodySchema = z.object({
      isOpen: z.boolean(),
      durationMinutes: z.number().int().min(1).max(1440), // Max 24 hours
      reason: z.string().max(200).optional(),
    });
    const body = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const until = new Date(Date.now() + body.durationMinutes * 60 * 1000);
    const raw = (shop.settings && typeof shop.settings === 'object') ? { ...(shop.settings as Record<string, unknown>) } : {};
    const updatedSettings = {
      ...raw,
      temporaryStatusOverride: {
        isOpen: body.isOpen,
        until: until.toISOString(),
        reason: body.reason,
      },
    };

    await db.update(schema.shops)
      .set({ 
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(schema.shops.id, shop.id));

    return reply.status(200).send({ success: true, until: until.toISOString() });
  });

  /**
   * Clear temporary shop status override (owner only).
   * 
   * @route DELETE /api/shops/:slug/temporary-status
   * @auth Owner only
   */
  fastify.delete('/shops/:slug/temporary-status', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    
    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const raw = (shop.settings && typeof shop.settings === 'object') ? { ...(shop.settings as Record<string, unknown>) } : {};
    const updatedSettings = { ...raw, temporaryStatusOverride: null };

    await db.update(schema.shops)
      .set({ 
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(schema.shops.id, shop.id));

    return reply.status(200).send({ success: true });
  });
};
