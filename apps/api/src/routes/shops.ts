import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { getShopBySlug } from '../lib/shop.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';

/** Default home page content when shop has none set. Every element is overridable per shop. */
const DEFAULT_HOME_CONTENT = {
  hero: {
    badge: 'Sangão, Santa Catarina',
    subtitle: 'Entre na fila online',
    ctaJoin: 'Entrar na Fila',
    ctaLocation: 'Como Chegar',
  },
  services: { sectionTitle: 'Serviços' },
  about: {
    sectionTitle: 'Sobre',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80',
    features: [
      { icon: 'schedule', text: 'Fila online' },
      { icon: 'workspace_premium', text: 'Produtos premium' },
      { icon: 'groups', text: 'Equipe experiente' },
      { icon: 'local_parking', text: 'Estacionamento fácil' },
    ],
  },
  location: {
    sectionTitle: 'Localização',
    address: 'R. João M Silvano, 281 - Morro Grande\nSangão - SC, 88717-000',
    addressLink: 'https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
    hours: 'Segunda a Sábado: 9:00 - 19:00\nDomingo: Fechado',
    phone: '(48) 99835-4097',
    phoneHref: 'tel:+5548998354097',
    languages: 'Português & English',
    mapQuery: 'R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
  },
} as const;

function mergeHomeContent(stored: unknown): typeof DEFAULT_HOME_CONTENT {
  if (!stored || typeof stored !== 'object') return DEFAULT_HOME_CONTENT;
  const s = stored as Record<string, unknown>;
  const deepMerge = <T>(def: T, from: unknown): T => {
    if (from == null || typeof from !== 'object') return def;
    const o = from as Record<string, unknown>;
    const out = { ...def } as Record<string, unknown>;
    for (const k of Object.keys(def as object)) {
      const defVal = (def as Record<string, unknown>)[k];
      const fromVal = o[k];
      if (defVal && typeof defVal === 'object' && !Array.isArray(defVal) && fromVal && typeof fromVal === 'object' && !Array.isArray(fromVal)) {
        out[k] = deepMerge(defVal, fromVal);
      } else if (fromVal !== undefined) {
        out[k] = Array.isArray(fromVal) ? [...fromVal] : fromVal;
      }
    }
    return out as T;
  };
  return deepMerge(DEFAULT_HOME_CONTENT, stored);
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

    const theme = shop.theme
      ? (JSON.parse(shop.theme) as { primary?: string; accent?: string })
      : null;

    const homeContent = mergeHomeContent(shop.homeContent ?? null);

    return {
      name: shop.name,
      theme: theme
        ? { primary: theme.primary ?? '#3E2723', accent: theme.accent ?? '#FFD54F' }
        : { primary: '#3E2723', accent: '#FFD54F' },
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

