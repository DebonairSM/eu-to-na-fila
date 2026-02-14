import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eq, and, or, isNull } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { validateRequest } from '../lib/validation.js';
import { ValidationError, NotFoundError } from '../lib/errors.js';
import { env } from '../env.js';
import { uploadAdOrderImage } from '../lib/storage.js';
import { getAmountCentsForCompany, formatBRL } from '../lib/ad-pricing.js';
import { sendAdOrderReminderToAdmin } from '../services/EmailService.js';
import Stripe from 'stripe';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for ad order images
const DURATION_OPTIONS = [10, 15, 20, 30] as const;

function getFrontendUrl(request: { headers: { origin?: string }; protocol: string; hostname: string }): string {
  const base = env.FRONTEND_PUBLIC_URL ?? (request.headers.origin || `${request.protocol}://${request.hostname}`);
  return base.replace(/\/$/, '');
}

export const propagandasPublicRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/public/propagandas/quote?duration_seconds=15&shop_count=0
   * Returns amount in BRL for the given duration. No auth.
   */
  fastify.get<{ Querystring: { duration_seconds?: string; shop_count?: string } }>(
    '/public/propagandas/quote',
    async (request, reply) => {
      const rootCompanyId = env.ROOT_COMPANY_ID;
      if (rootCompanyId == null) {
        return reply.send({ amount_cents: 0, amount_display: 'R$ 0,00' });
      }
      const raw = request.query.duration_seconds;
      const duration = raw ? parseInt(raw, 10) : 15;
      if (!DURATION_OPTIONS.includes(duration as 10 | 15 | 20 | 30)) {
        throw new ValidationError('Invalid duration', [{ field: 'duration_seconds', message: 'Must be 10, 15, 20 or 30' }]);
      }
      const amountCents = await getAmountCentsForCompany(rootCompanyId, duration);
      return reply.send({
        amount_cents: amountCents,
        amount_display: formatBRL(amountCents),
      });
    }
  );

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
   * POST /api/public/propagandas/checkout
   * Create order (no image), create Stripe Checkout Session, return checkoutUrl. Body: same as create order.
   */
  fastify.post<{ Body: unknown }>('/public/propagandas/checkout', async (request, reply) => {
    const rootCompanyId = env.ROOT_COMPANY_ID;
    const stripeSecret = env.STRIPE_SECRET_KEY;
    if (rootCompanyId == null) {
      throw new ValidationError('Propagandas not configured', [
        { field: 'company', message: 'ROOT_COMPANY_ID is not set' },
      ]);
    }
    if (!stripeSecret) {
      throw new ValidationError('Payments are not configured', [
        { field: 'payment', message: 'STRIPE_SECRET_KEY is not set' },
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
    const amountCents = await getAmountCentsForCompany(rootCompanyId, body.duration_seconds);
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
        amountCents,
      })
      .returning({ id: schema.adOrders.id });
    if (!order) {
      return reply.status(500).send({ error: 'Failed to create order' });
    }

    const baseUrl = getFrontendUrl(request);
    const successUrl = `${baseUrl}/propagandas/buy/complete?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/propagandas/buy`;

    const stripe = new Stripe(stripeSecret);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'brl',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: amountCents,
            product_data: {
              name: `Propaganda ${body.duration_seconds}s`,
              description: 'Anúncio em vídeo nas filas EuToNaFila',
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orderId: String(order.id) },
    });

    if (session.url) {
      await db
        .update(schema.adOrders)
        .set({ stripeSessionId: session.id, updatedAt: new Date() })
        .where(eq(schema.adOrders.id, order.id));
    }

    return reply.send({
      checkoutUrl: session.url ?? undefined,
      sessionId: session.id,
      orderId: order.id,
    });
  });

  /**
   * GET /api/public/propagandas/orders/complete?session_id=...
   * Verify Stripe session is paid and return orderId for image upload.
   */
  fastify.get<{ Querystring: { session_id: string } }>(
    '/public/propagandas/orders/complete',
    async (request, reply) => {
      const sessionId = request.query.session_id;
      if (!sessionId) {
        throw new ValidationError('session_id is required', [{ field: 'session_id', message: 'Missing' }]);
      }
      const stripeSecret = env.STRIPE_SECRET_KEY;
      const rootCompanyId = env.ROOT_COMPANY_ID;
      if (!stripeSecret || rootCompanyId == null) {
        throw new ValidationError('Not configured', [{ field: 'config', message: 'Payments or company not set' }]);
      }
      const stripe = new Stripe(stripeSecret);
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
      if (session.payment_status !== 'paid') {
        throw new ValidationError('Payment not completed', [{ field: 'session', message: 'Session is not paid' }]);
      }
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        return reply.status(400).send({ error: 'Invalid session metadata' });
      }
      const [order] = await db
        .select({ id: schema.adOrders.id })
        .from(schema.adOrders)
        .where(
          and(
            eq(schema.adOrders.id, parseInt(orderId, 10)),
            eq(schema.adOrders.companyId, rootCompanyId),
            eq(schema.adOrders.stripeSessionId, sessionId)
          )
        )
        .limit(1);
      if (!order) {
        throw new NotFoundError('Order not found');
      }
      return reply.send({ orderId: order.id });
    }
  );

  /**
   * POST /api/public/propagandas/orders/:id/image
   * Upload image for an ad order. Allowed when: pending_approval (any) or payment_status=paid and no image yet.
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
          or(
            eq(schema.adOrders.status, 'pending_approval'),
            and(eq(schema.adOrders.paymentStatus, 'paid'), isNull(schema.adOrders.imageStorageKey))
          )
        )
      )
      .limit(1);
    if (!order) {
      throw new NotFoundError('Order not found or not eligible for image upload');
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

    if (order.paymentStatus === 'paid') {
      const [company] = await db
        .select({
          name: schema.companies.name,
          propagandasReminderEmail: schema.companies.propagandasReminderEmail,
        })
        .from(schema.companies)
        .where(eq(schema.companies.id, order.companyId))
        .limit(1);
      if (company) {
        let toEmail = company.propagandasReminderEmail ?? null;
        if (!toEmail) {
          const [admin] = await db
            .select({ email: schema.companyAdmins.email })
            .from(schema.companyAdmins)
            .where(
              and(
                eq(schema.companyAdmins.companyId, order.companyId),
                eq(schema.companyAdmins.isActive, true)
              )
            )
            .limit(1);
          toEmail = admin?.email ?? null;
        }
        if (toEmail) {
          const baseUrl = getFrontendUrl(request);
          sendAdOrderReminderToAdmin(toEmail, {
            advertiserName: order.advertiserName,
            orderId: order.id,
            adsManagementUrl: `${baseUrl}/company/ads`,
          }).catch((err) => request.log.warn({ err, orderId }, 'Reminder email failed'));
        }
      }
    }

    return reply.send({ ok: true, imageUrl: publicUrl });
  });
};
