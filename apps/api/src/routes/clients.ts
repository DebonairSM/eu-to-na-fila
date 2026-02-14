import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { clientService } from '../services/index.js';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ForbiddenError } from '../lib/errors.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getShopBySlug } from '../lib/shop.js';
import { getPublicPath } from '../lib/paths.js';

/**
 * Client routes.
 * Handles client lookup (remember), client detail, clip notes, and service history.
 */
export const clientsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Lookup client by phone for join form prefilling (remember my info).
   * Public, rate-limited by global limiter.
   *
   * @route GET /api/shops/:slug/clients/remember
   * @query phone - Phone number to lookup
   * @returns { name?: string, hasClient: boolean }
   */
  fastify.get('/shops/:slug/clients/remember', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const querySchema = z.object({ phone: z.string().min(1) });
    const { phone } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const client = await clientService.findByPhone(shop.id, phone);
    return {
      hasClient: !!client,
      name: client?.name,
    };
  });

  /**
   * List all clients with pagination. Owner only.
   *
   * @route GET /api/shops/:slug/clients/list
   * @query page - Page number (default 1)
   * @query limit - Items per page (default 50)
   */
  fastify.get('/shops/:slug/clients/list', {
    preHandler: [requireAuth(), requireRole(['owner'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    });
    const { slug } = validateRequest(paramsSchema, request.params);
    const { page, limit } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const { clients, total } = await clientService.listByShop(shop.id, { page, limit });
    return { clients, total, page, limit };
  });

  /**
   * Search clients by name or phone. Staff/owner/barber only.
   *
   * @route GET /api/shops/:slug/clients
   * @query q - Search query
   */
  fastify.get('/shops/:slug/clients', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const querySchema = z.object({ q: z.string().default('') });
    const { q } = validateRequest(querySchema, request.query);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    if (request.user?.role === 'barber' && request.user.shopId !== shop.id) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const clients = await clientService.search(shop.id, q);
    return { clients };
  });

  /**
   * Get client detail with clip notes and service history. Staff/owner/barber only.
   *
   * @route GET /api/shops/:slug/clients/:id
   */
  fastify.get('/shops/:slug/clients/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    if (request.user?.role === 'barber' && request.user.shopId !== shop.id) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const client = await clientService.getByIdWithShopCheck(id, shop.id);
    if (!client) throw new NotFoundError('Client not found');

    const [clipNotes, serviceHistory] = await Promise.all([
      clientService.getClipNotes(id, shop.id),
      clientService.getServiceHistory(id, shop.id),
    ]);

    const isBarber = request.user?.role === 'barber';
    if (isBarber) {
      return {
        client: { id: client.id },
        clipNotes,
        serviceHistory,
      };
    }

    return {
      client: {
        ...client,
        nextServiceNote: (client as { nextServiceNote?: string | null }).nextServiceNote ?? null,
        nextServiceImageUrl: (client as { nextServiceImageUrl?: string | null }).nextServiceImageUrl ?? null,
      },
      clipNotes,
      serviceHistory,
    };
  });

  /**
   * Serve client reference image. Staff/owner/barber only.
   * For local-stored images, serves from disk. For Supabase URLs, redirects.
   *
   * @route GET /api/shops/:slug/clients/:id/reference-image
   */
  fastify.get('/shops/:slug/clients/:id/reference-image', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const user = request.user as { role?: string; shopId?: number } | undefined;
    if (user?.role === 'barber') {
      throw new ForbiddenError('Barbers cannot view client reference image');
    }
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id } = validateRequest(paramsSchema, request.params);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    if (user?.role === 'barber' && user.shopId !== shop.id) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const client = await clientService.getByIdWithShopCheck(id, shop.id);
    if (!client) throw new NotFoundError('Client not found');

    const imageUrl = (client as { nextServiceImageUrl?: string | null }).nextServiceImageUrl;
    if (!imageUrl) {
      return reply.status(404).send({ error: 'No reference image' });
    }

    // If URL points to our customer reference route, serve from local storage
    if (imageUrl.includes('/auth/customer/me/reference/image')) {
      const publicPath = getPublicPath();
      const companyId = (shop as { companyId?: number | null }).companyId;
      const dir = companyId != null
        ? join(publicPath, 'companies', String(companyId), 'shops', String(shop.id), 'clients', String(id))
        : join(publicPath, 'shops', String(shop.id), 'clients', String(id));
      const exts = ['.png', '.jpg', '.jpeg', '.webp'];
      for (const ext of exts) {
        const filePath = join(dir, `reference${ext}`);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return reply.type(contentType).send(content);
        }
      }
      return reply.status(404).send({ error: 'Image file not found' });
    }

    // External URL (Supabase) - redirect
    return reply.redirect(302, imageUrl);
  });

  /**
   * Update client info. Staff/owner/barber only.
   *
   * @route PATCH /api/shops/:slug/clients/:id
   */
  fastify.patch('/shops/:slug/clients/:id', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    if (request.user?.role === 'barber') {
      throw new ForbiddenError('Barbers cannot update client profile');
    }
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id } = validateRequest(paramsSchema, request.params);
    const bodySchema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().nullable().optional(),
    });
    const data = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    const client = await clientService.update(id, shop.id, data);
    return client;
  });

  /**
   * Add clip note to client. Staff/owner/barber only.
   * Barbers use their own id; owner/staff may pass barberId to attribute the note.
   *
   * @route POST /api/shops/:slug/clients/:id/clip-notes
   */
  fastify.post('/shops/:slug/clients/:id/clip-notes', {
    preHandler: [requireAuth(), requireRole(['owner', 'staff', 'barber'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1),
      id: z.coerce.number().int().positive(),
    });
    const { slug, id } = validateRequest(paramsSchema, request.params);
    const bodySchema = z.object({
      note: z.string().min(1).max(2000),
      barberId: z.number().int().positive().optional(),
    });
    const body = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError(`Shop with slug "${slug}" not found`);

    if (request.user?.role === 'barber' && request.user.shopId !== shop.id) {
      throw new NotFoundError(`Shop with slug "${slug}" not found`);
    }

    const barberId = request.user?.barberId ?? body.barberId;
    if (!barberId) throw new NotFoundError('Barber context required to add clip note');

    const clipNote = await clientService.addClipNote(id, shop.id, barberId, body.note);
    return reply.status(201).send(clipNote);
  });
};
