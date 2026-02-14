import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { validateRequest } from '../lib/validation.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';
import { env } from '../env.js';
import { uploadAdOrderImage } from '../lib/storage.js';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for ad order images
const DURATION_OPTIONS = [10, 15, 20, 30] as const;

export const propagandasPublicRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/public/propagandas/shops
   * Returns list of shops for the root company (for buy-ad barbershop selection). No auth.
   */
  fastify.get('/public/propagandas/shops', async (_request, reply) => {
    const rootCompanyId = env.ROOT_COMPANY_ID;
    if (rootCompanyId == null) {
      return reply.send([]);
    }
    const shops = await db.query.shops.findMany({
      where: eq(schema.shops.companyId, rootCompanyId),
      columns: { id: true, name: true },
      orderBy: (s, { asc }) => [asc(s.name)],
    });
    return reply.send(shops);
  });

  /**
   * POST /api/public/propagandas/orders
   * Create an ad order (pending_approval). No auth. Body: advertiser_name, advertiser_email, advertiser_phone?, duration_seconds, shop_ids.
   */
  fastify.post('/public/propagandas/orders', async (request, reply) => {
    const rootCompanyId = env.ROOT_COMPANY_ID;
    if (rootCompanyId == null) {
      throw new ValidationError('Propagandas not configured', [
        { field: 'company', message: 'ROOT_COMPANY_ID is not set' },
      ]);
    }
    const bodySchema = z.object({
      advertiser_name: z.string().min(1, 'Name is required'),
      advertiser_email: z.string().email('Invalid email'),
      advertiser_phone: z.string().optional(),
      duration_seconds: z.number().refine((n) => DURATION_OPTIONS.includes(n as 10 | 15 | 20 | 30), 'Invalid duration'),
      shop_ids: z.array(z.number().int().positive()).default([]),
    });
    const body = validateRequest(bodySchema, request.body);
    const [order] = await db
      .insert(schema.adOrders)
      .values({
        companyId: rootCompanyId,
        advertiserName: body.advertiser_name,
        advertiserEmail: body.advertiser_email,
        advertiserPhone: body.advertiser_phone ?? null,
        durationSeconds: body.duration_seconds,
        shopIds: body.shop_ids,
        status: 'pending_approval',
        paymentStatus: 'pending',
      })
      .returning({ id: schema.adOrders.id });
    if (!order) {
      return reply.status(500).send({ error: 'Failed to create order' });
    }
    return reply.status(201).send({ orderId: order.id });
  });

  /**
   * POST /api/public/propagandas/orders/:id/image
   * Upload image for an ad order. Order must be pending_approval. Multipart file.
   */
  fastify.post<{
    Params: { id: string };
  }>('/public/propagandas/orders/:id/image', async (request, reply) => {
    const orderId = parseInt(request.params.id, 10);
    if (Number.isNaN(orderId)) {
      throw new ValidationError('Invalid order ID', [{ field: 'id', message: 'Must be a number' }]);
    }
    const rootCompanyId = env.ROOT_COMPANY_ID;
    if (rootCompanyId == null) {
      throw new ValidationError('Propagandas not configured', [
        { field: 'company', message: 'ROOT_COMPANY_ID is not set' },
      ]);
    }

    const [order] = await db
      .select()
      .from(schema.adOrders)
      .where(
        and(
          eq(schema.adOrders.id, orderId),
          eq(schema.adOrders.companyId, rootCompanyId),
          eq(schema.adOrders.status, 'pending_approval')
        )
      )
      .limit(1);
    if (!order) {
      throw new NotFoundError('Order not found or not pending');
    }

    let fileBuffer: Buffer | null = null;
    let fileMimetype: string | null = null;
    let fileBytesRead = 0;
    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileBuffer = await part.toBuffer();
          fileMimetype = part.mimetype;
          fileBytesRead = part.file.bytesRead;
          break;
        }
      }
    } catch (err) {
      request.log.error({ err }, 'Error parsing multipart');
      throw new ValidationError('Invalid upload', [{ field: 'file', message: 'Invalid multipart data' }]);
    }

    if (!fileBuffer || !fileMimetype) {
      throw new ValidationError('No file provided', [{ field: 'file', message: 'File is required' }]);
    }
    if (!ALLOWED_IMAGE_TYPES.includes(fileMimetype)) {
      throw new ValidationError(`Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`, [
        { field: 'file', message: 'Invalid image type' },
      ]);
    }
    if (fileBytesRead > MAX_IMAGE_SIZE) {
      throw new ValidationError(`File too large. Max ${MAX_IMAGE_SIZE / 1024 / 1024}MB`, [
        { field: 'file', message: 'File size exceeds limit' },
      ]);
    }

    const { publicUrl, storageKey } = await uploadAdOrderImage(
      rootCompanyId,
      orderId,
      fileBuffer,
      fileMimetype
    );

    await db
      .update(schema.adOrders)
      .set({
        imageStorageKey: storageKey,
        imagePublicUrl: publicUrl,
        imageMimeType: fileMimetype,
        imageBytes: fileBytesRead,
        updatedAt: new Date(),
      })
      .where(eq(schema.adOrders.id, orderId));

    return reply.send({ ok: true, imageUrl: publicUrl });
  });
};
