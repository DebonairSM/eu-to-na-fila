import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { getShopBySlug } from '../lib/shop.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { normalizeToHomeContentByLocale } from '../lib/homeContent.js';
import { parseResolvedStyle, parseTheme } from '../lib/theme.js';
import { parseSettings } from '../lib/settings.js';

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
};
