import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { getShopBySlug } from '../lib/shop.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { mergeHomeContent } from '../lib/homeContent.js';

const DEFAULT_THEME = {
  primary: '#3E2723',
  accent: '#FFD54F',
  background: '#0a0a0a',
  surfacePrimary: '#0a0a0a',
  surfaceSecondary: '#1a1a1a',
  navBg: '#0a0a0a',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  borderColor: 'rgba(255,255,255,0.08)',
};

function parseTheme(themeJson: string | null): typeof DEFAULT_THEME {
  if (!themeJson) return DEFAULT_THEME;
  try {
    const parsed = JSON.parse(themeJson) as Record<string, string>;
    return {
      primary: parsed.primary ?? DEFAULT_THEME.primary,
      accent: parsed.accent ?? DEFAULT_THEME.accent,
      background: parsed.background ?? DEFAULT_THEME.background,
      surfacePrimary: parsed.surfacePrimary ?? DEFAULT_THEME.surfacePrimary,
      surfaceSecondary: parsed.surfaceSecondary ?? DEFAULT_THEME.surfaceSecondary,
      navBg: parsed.navBg ?? DEFAULT_THEME.navBg,
      textPrimary: parsed.textPrimary ?? DEFAULT_THEME.textPrimary,
      textSecondary: parsed.textSecondary ?? DEFAULT_THEME.textSecondary,
      borderColor: parsed.borderColor ?? DEFAULT_THEME.borderColor,
    };
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Shop routes.
 * Handles shop listing and public config.
 */
export const shopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get public shop config (name, theme, path, homeContent). No auth required.
   *
   * @route GET /api/shops/:slug/config
   * @returns { name, theme: { primary, accent }, path, homeContent }
   */
  fastify.get('/shops/:slug/config', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const theme = parseTheme(shop.theme);
    const homeContent = mergeHomeContent(shop.homeContent ?? null);

    return {
      name: shop.name,
      theme,
      path: shop.path ?? `/projects/${shop.slug}`,
      homeContent,
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

