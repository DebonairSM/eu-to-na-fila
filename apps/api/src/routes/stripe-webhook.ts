import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { Readable } from 'stream';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';
import { env } from '../env.js';
import { db, schema } from '../db/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

export const stripeWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  const webhookPath = '/stripe/webhook';

  fastify.addHook('preParsing', async (request, _reply, payload) => {
    const url = request.url?.split('?')[0] ?? '';
    if (url.includes(webhookPath) && request.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of payload as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const rawBody = Buffer.concat(chunks);
      (request as FastifyRequest & { rawBody: Buffer }).rawBody = rawBody;
      return Readable.from(rawBody);
    }
    return payload;
  });

  fastify.post<{ Body: unknown }>(webhookPath, async (request, reply) => {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      request.log.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set');
      return reply.status(501).send({ error: 'Webhook not configured' });
    }
    const rawBody = request.rawBody;
    const signature = request.headers['stripe-signature'];
    if (!rawBody || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'Missing body or stripe-signature' });
    }
    let event: Stripe.Event;
    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY!);
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      request.log.warn({ err }, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: 'Invalid signature' });
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (!orderId) {
        request.log.warn({ sessionId: session.id }, 'Checkout session missing orderId metadata');
        return reply.send();
      }
      const id = parseInt(orderId, 10);
      if (Number.isNaN(id)) {
        return reply.send();
      }
      const amountCents = session.amount_total != null ? Math.round(session.amount_total) : null;
      await db
        .update(schema.adOrders)
        .set({
          paymentStatus: 'paid',
          ...(amountCents != null && amountCents > 0 ? { amountCents } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.adOrders.id, id),
            eq(schema.adOrders.paymentStatus, 'pending')
          )
        );
      request.log.info({ orderId: id }, 'Ad order marked as paid');
    }
    return reply.send();
  });
};
