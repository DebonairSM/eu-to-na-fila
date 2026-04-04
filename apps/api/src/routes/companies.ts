import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, desc, sql, gte, lt, inArray } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { env } from '../env.js';
import { buildUsageDrilldownGraph } from '../lib/usageDrilldown.js';

let lastNominatimRequest = 0;
const MAX_USAGE_DAYS = 180;
const MAX_DRILLDOWN_LIMIT = 50;

function getUsageWindow(query: { days?: number; since?: string; until?: string }): { since: Date; until: Date } {
  const now = new Date();
  const until = query.until ? new Date(query.until) : now;
  const defaultDays = query.days ?? 30;
  const clampedDays = Math.max(1, Math.min(MAX_USAGE_DAYS, defaultDays));
  const rawSince = query.since ? new Date(query.since) : new Date(until.getTime() - clampedDays * 24 * 60 * 60 * 1000);
  const maxSince = new Date(until.getTime() - MAX_USAGE_DAYS * 24 * 60 * 60 * 1000);
  const since = rawSince < maxSince ? maxSince : rawSince;
  return { since, until };
}

/**
 * Company routes.
 * Handles company details and dashboard.
 * Shop CRUD lives in company-shops.ts.
 */
export const companiesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get company details.
   * 
   * @route GET /api/companies/:id
   * @returns Company details
   */
  fastify.get(
    '/companies/:id',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const company = await db.query.companies.findFirst({
        where: eq(schema.companies.id, id),
      });

      if (!company) {
        throw new NotFoundError('Company not found');
      }

      return company;
    }
  );

  /**
   * GET /api/companies/:id/ad-pricing
   * Returns Propagandas pricing (per duration in cents). Company admin only.
   */
  fastify.get(
    '/companies/:id/ad-pricing',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const rows = await db.query.adPricing.findMany({
        where: eq(schema.adPricing.companyId, id),
        columns: { durationSeconds: true, amountCents: true },
      });
      const pricing: Record<string, number> = {};
      for (const r of rows) {
        pricing[String(r.durationSeconds)] = r.amountCents;
      }
      return reply.send(pricing);
    }
  );

  /**
   * PUT /api/companies/:id/ad-pricing
   * Upsert Propagandas pricing. Body: { "10": 3000, "15": 4500, "20": 6000, "30": 9000 } (cents). Company admin only.
   */
  fastify.put(
    '/companies/:id/ad-pricing',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const bodySchema = z.object({
        10: z.number().int().min(0).optional(),
        15: z.number().int().min(0).optional(),
        20: z.number().int().min(0).optional(),
        30: z.number().int().min(0).optional(),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      const body = validateRequest(bodySchema, request.body as Record<string, unknown>);
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const durations = [10, 15, 20, 30] as const;
      const now = new Date();
      for (const dur of durations) {
        const cents = body[dur];
        if (cents === undefined) continue;
        await db
          .insert(schema.adPricing)
          .values({
            companyId: id,
            durationSeconds: dur,
            amountCents: cents,
          })
          .onConflictDoUpdate({
            target: [schema.adPricing.companyId, schema.adPricing.durationSeconds],
            set: { amountCents: cents, updatedAt: now },
          });
      }
      const rows = await db.query.adPricing.findMany({
        where: eq(schema.adPricing.companyId, id),
        columns: { durationSeconds: true, amountCents: true },
      });
      const pricing: Record<string, number> = {};
      for (const r of rows) {
        pricing[String(r.durationSeconds)] = r.amountCents;
      }
      return reply.send(pricing);
    }
  );

  /**
   * PATCH /api/companies/:id
   * Update company (e.g. propagandas_reminder_email). Company admin only.
   */
  fastify.patch(
    '/companies/:id',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const bodySchema = z.object({
        propagandas_reminder_email: z.string().email().nullable().optional(),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      const body = validateRequest(bodySchema, request.body as Record<string, unknown>);
      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const update: { propagandasReminderEmail?: string | null } = {};
      if (body.propagandas_reminder_email !== undefined) {
        update.propagandasReminderEmail = body.propagandas_reminder_email;
      }
      if (Object.keys(update).length === 0) {
        const company = await db.query.companies.findFirst({
          where: eq(schema.companies.id, id),
        });
        if (!company) throw new NotFoundError('Company not found');
        return reply.send(company);
      }
      const [updated] = await db
        .update(schema.companies)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(schema.companies.id, id))
        .returning();
      if (!updated) throw new NotFoundError('Company not found');
      return reply.send(updated);
    }
  );

  /**
   * Get company dashboard data.
   * 
   * @route GET /api/companies/:id/dashboard
   * @returns Dashboard statistics
   */
  fastify.get(
    '/companies/:id/dashboard',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shops = await db.query.shops.findMany({
        where: eq(schema.shops.companyId, id),
      });

      const enabledAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, id),
          eq(schema.companyAds.enabled, true)
        ),
      });

      const allAds = await db.query.companyAds.findMany({
        where: eq(schema.companyAds.companyId, id),
      });

      return {
        totalShops: shops.length,
        activeAds: enabledAds.length,
        totalAds: allAds.length,
      };
    }
  );

  /**
   * GET /api/companies/:id/usage
   * Company admin only. Returns aggregated API usage for the company's shops.
   * Query: days (default 30) or since/until (ISO date strings).
   */
  fastify.get(
    '/companies/:id/usage',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId === undefined) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const querySchema = z.object({
        days: z.string().transform((v) => parseInt(v, 10)).optional(),
        since: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
        shopId: z.string().transform((v) => parseInt(v, 10)).optional(),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      const query = validateRequest(querySchema, request.query as Record<string, unknown>);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const { since, until } = getUsageWindow(query);
      let scopedShopId: number | undefined;
      if (query.shopId != null && Number.isFinite(query.shopId)) {
        const shop = await db.query.shops.findFirst({
          where: and(eq(schema.shops.id, query.shopId), eq(schema.shops.companyId, id)),
          columns: { id: true },
        });
        if (!shop) {
          return reply.status(404).send({ error: 'Shop not found for this company' });
        }
        scopedShopId = shop.id;
      }

      const buckets = await db
        .select({
          shopId: schema.apiUsageBuckets.shopId,
          bucketStart: schema.apiUsageBuckets.bucketStart,
          endpointTag: schema.apiUsageBuckets.endpointTag,
          method: schema.apiUsageBuckets.method,
          clientContext: schema.apiUsageBuckets.clientContext,
          requestCount: schema.apiUsageBuckets.requestCount,
        })
        .from(schema.apiUsageBuckets)
        .where(
          and(
            eq(schema.apiUsageBuckets.companyId, id),
            gte(schema.apiUsageBuckets.bucketStart, since),
            lt(schema.apiUsageBuckets.bucketStart, until),
            scopedShopId ? eq(schema.apiUsageBuckets.shopId, scopedShopId) : sql`TRUE`
          )
        );

      const totalRequests = buckets.reduce((sum, r) => sum + (r.requestCount ?? 0), 0);

      const byShop = new Map<number, number>();
      for (const r of buckets) {
        const sid = r.shopId ?? 0;
        byShop.set(sid, (byShop.get(sid) ?? 0) + (r.requestCount ?? 0));
      }

      const shopIds = Array.from(byShop.keys()).filter((sid) => sid > 0);
      const shopsList =
        shopIds.length > 0
          ? await db.query.shops.findMany({
              where: and(eq(schema.shops.companyId, id), inArray(schema.shops.id, shopIds)),
              columns: { id: true, name: true, slug: true },
            })
          : [];
      const perShop = shopsList.map((s) => ({
        shopId: s.id,
        shopName: s.name,
        shopSlug: s.slug,
        requestCount: byShop.get(s.id) ?? 0,
      }));

      const byDay = new Map<string, number>();
      for (const r of buckets) {
        const d = r.bucketStart instanceof Date ? r.bucketStart.toISOString().slice(0, 10) : String(r.bucketStart).slice(0, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + (r.requestCount ?? 0));
      }
      const timeSeries = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, requestCount]) => ({ date, requestCount }));

      const byClientContextMap = new Map<string, number>();
      const endpointTotalsMap = new Map<string, { endpointTag: string; method: string; requestCount: number }>();
      for (const r of buckets) {
        const context = r.clientContext ?? 'unknown';
        byClientContextMap.set(context, (byClientContextMap.get(context) ?? 0) + (r.requestCount ?? 0));

        const endpointKey = `${r.endpointTag}:${r.method}`;
        const existing = endpointTotalsMap.get(endpointKey);
        if (existing) {
          existing.requestCount += r.requestCount ?? 0;
        } else {
          endpointTotalsMap.set(endpointKey, {
            endpointTag: r.endpointTag,
            method: r.method,
            requestCount: r.requestCount ?? 0,
          });
        }
      }
      const byClientContext = Array.from(byClientContextMap.entries())
        .map(([clientContext, requestCount]) => ({ clientContext, requestCount }))
        .sort((a, b) => b.requestCount - a.requestCount);
      const topEndpoints = Array.from(endpointTotalsMap.values())
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 15);

      return reply.send({
        totalRequests,
        since: since.toISOString(),
        until: until.toISOString(),
        perShop,
        timeSeries,
        byClientContext,
        topEndpoints,
      });
    }
  );

  /**
   * GET /api/companies/:id/usage/drilldown
   * Company admin only. Returns graph-ready aggregated usage nodes/edges for a selected scope.
   */
  fastify.get(
    '/companies/:id/usage/drilldown',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId === undefined) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const querySchema = z.object({
        days: z.string().transform((v) => parseInt(v, 10)).optional(),
        since: z.string().datetime().optional(),
        until: z.string().datetime().optional(),
        shopId: z.string().transform((v) => parseInt(v, 10)).optional(),
        group: z.enum(['endpoint', 'source']).optional(),
        endpointTag: z.string().max(48).optional(),
        method: z.string().max(10).optional(),
        clientContext: z.enum(['web', 'kiosk', 'company_admin', 'unknown']).optional(),
        limit: z.string().transform((v) => parseInt(v, 10)).optional(),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      const query = validateRequest(querySchema, request.query as Record<string, unknown>);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const group = query.group ?? 'endpoint';
      const { since, until } = getUsageWindow(query);
      const limit = Math.max(1, Math.min(MAX_DRILLDOWN_LIMIT, query.limit ?? 20));

      let scopedShop: { id: number; name: string; slug: string } | null = null;
      if (query.shopId != null && Number.isFinite(query.shopId)) {
        const found = await db.query.shops.findFirst({
          where: and(eq(schema.shops.id, query.shopId), eq(schema.shops.companyId, id)),
          columns: { id: true, name: true, slug: true },
        });
        if (!found) {
          return reply.status(404).send({ error: 'Shop not found for this company' });
        }
        scopedShop = found;
      }

      const buckets = await db
        .select({
          shopId: schema.apiUsageBuckets.shopId,
          endpointTag: schema.apiUsageBuckets.endpointTag,
          method: schema.apiUsageBuckets.method,
          clientContext: schema.apiUsageBuckets.clientContext,
          requestCount: schema.apiUsageBuckets.requestCount,
        })
        .from(schema.apiUsageBuckets)
        .where(
          and(
            eq(schema.apiUsageBuckets.companyId, id),
            gte(schema.apiUsageBuckets.bucketStart, since),
            lt(schema.apiUsageBuckets.bucketStart, until),
            scopedShop ? eq(schema.apiUsageBuckets.shopId, scopedShop.id) : sql`TRUE`,
            query.endpointTag ? eq(schema.apiUsageBuckets.endpointTag, query.endpointTag) : sql`TRUE`,
            query.method ? eq(schema.apiUsageBuckets.method, query.method) : sql`TRUE`,
            query.clientContext ? eq(schema.apiUsageBuckets.clientContext, query.clientContext) : sql`TRUE`
          )
        );
      // #region agent log
      fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'usage-drilldown-run',hypothesisId:'H5',location:'companies.ts:usageDrilldown:buckets',message:'drilldown buckets fetched',data:{companyId:id,group,scopedShopId:scopedShop?.id??null,bucketCount:buckets.length,bucketsWithShopId:buckets.filter((b)=>typeof b.shopId==='number').length,bucketsWithoutShopId:buckets.filter((b)=>typeof b.shopId!=='number').length,clientContext:query.clientContext??null,endpointTag:query.endpointTag??null,method:query.method??null,limit},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      const shopIds = [...new Set(buckets.map((b) => b.shopId).filter((v): v is number => typeof v === 'number'))];
      const shops = shopIds.length > 0
        ? await db.query.shops.findMany({
            where: and(eq(schema.shops.companyId, id), inArray(schema.shops.id, shopIds)),
            columns: { id: true, name: true, slug: true },
          })
        : [];
      const shopMap = new Map(shops.map((s) => [s.id, s]));

      const rootLabel = group === 'source'
        ? (query.clientContext ?? 'all_sources')
        : `${query.endpointTag ?? 'all_endpoints'}${query.method ? `:${query.method}` : ''}`;
      const { nodes, edges } = buildUsageDrilldownGraph(buckets, shops, group, rootLabel, limit);
      // #region agent log
      fetch('http://127.0.0.1:7807/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'usage-drilldown-run',hypothesisId:'H8',location:'companies.ts:usageDrilldown:graphBuilt',message:'drilldown graph built',data:{nodeCount:nodes.length,edgeCount:edges.length,shopNodeCount:nodes.filter((n)=>n.type==='shop').length,detailNodeCount:nodes.filter((n)=>n.type==='detail').length,rootLabel},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

      return reply.send({
        since: since.toISOString(),
        until: until.toISOString(),
        group,
        scope: {
          shopId: scopedShop?.id ?? null,
          shopName: scopedShop?.name ?? null,
          shopSlug: scopedShop?.slug ?? null,
        },
        filters: {
          endpointTag: query.endpointTag ?? null,
          method: query.method ?? null,
          clientContext: query.clientContext ?? null,
        },
        nodes,
        edges,
      });
    }
  );

  /**
   * GET /api/companies/:id/usage/alerts
   * Company admin only. Returns usage alerts (spike anomalies) for the company's shops.
   */
  fastify.get(
    '/companies/:id/usage/alerts',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId === undefined) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const querySchema = z.object({
        resolved: z.enum(['true', 'false']).optional(),
      });
      const { id } = validateRequest(paramsSchema, request.params);
      const query = validateRequest(querySchema, request.query as Record<string, unknown>);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const conditions = [eq(schema.usageAlerts.companyId, id)];
      if (query.resolved === 'false') {
        conditions.push(sql`${schema.usageAlerts.resolvedAt} IS NULL`);
      } else if (query.resolved === 'true') {
        conditions.push(sql`${schema.usageAlerts.resolvedAt} IS NOT NULL`);
      }

      const alerts = await db
        .select()
        .from(schema.usageAlerts)
        .where(and(...conditions))
        .orderBy(desc(schema.usageAlerts.triggeredAt))
        .limit(100);

      const shopIds = [...new Set(alerts.map((a) => a.shopId))];
      const shops =
        shopIds.length > 0
          ? await db.query.shops.findMany({
              where: eq(schema.shops.companyId, id),
              columns: { id: true, name: true, slug: true },
            })
          : [];
      const shopMap = new Map(shops.map((s) => [s.id, s]));

      const list = alerts.map((a) => ({
        id: a.id,
        shopId: a.shopId,
        shopName: shopMap.get(a.shopId)?.name ?? null,
        shopSlug: shopMap.get(a.shopId)?.slug ?? null,
        triggeredAt: a.triggeredAt,
        periodStart: a.periodStart,
        periodEnd: a.periodEnd,
        requestCount: a.requestCount,
        baselineCount: a.baselineCount,
        reason: a.reason,
        resolvedAt: a.resolvedAt,
      }));

      return reply.send({ alerts: list });
    }
  );

  /**
   * PATCH /api/companies/:id/usage/alerts/:alertId
   * Company admin only. Mark a usage alert as resolved.
   */
  fastify.patch(
    '/companies/:id/usage/alerts/:alertId',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId === undefined) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
        alertId: z.string().transform((val) => parseInt(val, 10)),
      });
      const { id, alertId } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const alert = await db.query.usageAlerts.findFirst({
        where: and(eq(schema.usageAlerts.id, alertId), eq(schema.usageAlerts.companyId, id)),
      });
      if (!alert) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      await db
        .update(schema.usageAlerts)
        .set({ resolvedAt: new Date() })
        .where(eq(schema.usageAlerts.id, alertId));

      return reply.send({ ok: true, resolvedAt: new Date().toISOString() });
    }
  );

  /**
   * Look up place data by address.
   * Uses Google Places API if GOOGLE_PLACES_API_KEY is set; otherwise uses Nominatim (OpenStreetMap), which is free and requires no key.
   * Used when creating/editing a barbershop to pre-fill location fields.
   *
   * @route GET /api/companies/:id/places-lookup?address=...
   * @returns { location: { name?, address?, addressLink?, mapQuery?, phone?, phoneHref?, hours? } }
   */
  fastify.get(
    '/companies/:id/places-lookup',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || !request.user.companyId) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const querySchema = z.object({
        address: z.string().min(1).max(500),
      });

      const { id } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const { address } = validateRequest(querySchema, request.query as Record<string, unknown>);

      type LocationResult = {
        name?: string;
        address?: string;
        addressLink?: string;
        mapQuery?: string;
        phone?: string;
        phoneHref?: string;
        hours?: string;
      };

      if (env.GOOGLE_PLACES_API_KEY) {
        const key = env.GOOGLE_PLACES_API_KEY;
        const findUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
        findUrl.searchParams.set('input', address);
        findUrl.searchParams.set('inputtype', 'textquery');
        findUrl.searchParams.set('fields', 'place_id');
        findUrl.searchParams.set('key', key);

        const findRes = await fetch(findUrl.toString());
        if (!findRes.ok) {
          fastify.log.warn({ status: findRes.status }, 'Google Find Place request failed');
          return reply.status(200).send({ location: {} });
        }

        const findData = (await findRes.json()) as {
          candidates?: Array<{ place_id?: string }>;
          status?: string;
        };

        if (findData.status !== 'OK' || !findData.candidates?.length || !findData.candidates[0].place_id) {
          return reply.status(200).send({ location: {} });
        }

        const placeId = findData.candidates[0].place_id;
        const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
        detailsUrl.searchParams.set('place_id', placeId);
        detailsUrl.searchParams.set(
          'fields',
          'name,formatted_address,formatted_phone_number,international_phone_number,opening_hours,url'
        );
        detailsUrl.searchParams.set('key', key);

        const detailsRes = await fetch(detailsUrl.toString());
        if (!detailsRes.ok) {
          fastify.log.warn({ status: detailsRes.status }, 'Google Place Details request failed');
          return reply.status(200).send({ location: {} });
        }

        const detailsData = (await detailsRes.json()) as {
          status?: string;
          result?: {
            name?: string;
            formatted_address?: string;
            formatted_phone_number?: string;
            international_phone_number?: string;
            url?: string;
            opening_hours?: { weekday_text?: string[] };
          };
        };

        if (detailsData.status !== 'OK' || !detailsData.result) {
          return reply.status(200).send({ location: {} });
        }

        const r = detailsData.result;
        const location: LocationResult = {};

        if (typeof r.name === 'string' && r.name.trim()) location.name = r.name.trim();
        if (typeof r.formatted_address === 'string' && r.formatted_address.trim()) {
          location.address = r.formatted_address.trim();
        }
        if (typeof r.url === 'string' && r.url.trim()) {
          location.addressLink = r.url.trim();
        } else if (location.address) {
          location.addressLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address)}`;
        }
        if (location.address) location.mapQuery = location.address;
        else if (location.name) location.mapQuery = location.name;

        if (typeof r.formatted_phone_number === 'string' && r.formatted_phone_number.trim()) {
          location.phone = r.formatted_phone_number.trim();
        }
        const intl = typeof r.international_phone_number === 'string' ? r.international_phone_number.trim() : '';
        if (intl) {
          location.phoneHref = intl.startsWith('tel:') ? intl : `tel:${intl.replace(/\s/g, '')}`;
        } else if (location.phone) {
          location.phoneHref = `tel:${location.phone.replace(/\s/g, '')}`;
        }

        const weekdayText = r.opening_hours?.weekday_text;
        if (Array.isArray(weekdayText) && weekdayText.length > 0) {
          location.hours = weekdayText.join('\n');
        }

        return reply.status(200).send({ location });
      }

      const nominatimBase = env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org';
      const searchUrl = new URL(`${nominatimBase}/search`);
      searchUrl.searchParams.set('q', address);
      searchUrl.searchParams.set('format', 'json');
      searchUrl.searchParams.set('limit', '1');

      const userAgent = env.NOMINATIM_USER_AGENT ?? 'EuToNaFila/1.0 (address lookup; https://github.com/eu-to-na-fila)';
      const minIntervalMs = 1100;
      const wait = Math.max(0, minIntervalMs - (Date.now() - lastNominatimRequest));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastNominatimRequest = Date.now();

      const searchRes = await fetch(searchUrl.toString(), {
        headers: { 'User-Agent': userAgent },
      });
      if (!searchRes.ok) {
        fastify.log.warn({ status: searchRes.status }, 'Nominatim search request failed');
        return reply.status(200).send({ location: {} });
      }

      const results = (await searchRes.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
        name?: string;
        type?: string;
      }>;

      if (!Array.isArray(results) || results.length === 0) {
        return reply.status(200).send({ location: {} });
      }

      const first = results[0];
      const displayAddress = typeof first.display_name === 'string' ? first.display_name.trim() : '';
      const name = typeof first.name === 'string' ? first.name.trim() : '';

      const location: LocationResult = {};
      if (name) location.name = name;
      if (displayAddress) {
        location.address = displayAddress;
        location.mapQuery = displayAddress;
        location.addressLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`;
      }
      return reply.status(200).send({ location });
    }
  );

  /**
   * Get ad orders for the company (admin). Optional filter by status.
   *
   * @route GET /api/companies/:id/ad-orders
   * @query status - Optional: pending_approval | approved | rejected
   */
  fastify.get(
    '/companies/:id/ad-orders',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId == null) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
      });
      const querySchema = z.object({
        status: z.enum(['pending_approval', 'approved', 'rejected']).optional(),
      });
      const { id: companyId } = validateRequest(paramsSchema, request.params);
      const query = validateRequest(querySchema, request.query as Record<string, unknown>);

      if (request.user.companyId !== companyId) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const conditions = [eq(schema.adOrders.companyId, companyId)];
      if (query.status) {
        conditions.push(eq(schema.adOrders.status, query.status));
      }
      const orders = await db.query.adOrders.findMany({
        where: and(...conditions),
        orderBy: [desc(schema.adOrders.createdAt)],
      });
      return reply.send(orders);
    }
  );

  /**
   * PATCH /api/companies/:id/ad-orders/:orderId
   * Body: { action: 'approve' | 'reject' | 'mark_paid' }
   * On approve: creates company_ad(s) from order image and sets order status to approved.
   */
  fastify.patch(
    '/companies/:id/ad-orders/:orderId',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId == null) {
        return reply.status(403).send({
          error: 'Company admin access required',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }
      const paramsSchema = z.object({
        id: z.string().transform((val) => parseInt(val, 10)),
        orderId: z.string().transform((val) => parseInt(val, 10)),
      });
      const bodySchema = z.object({
        action: z.enum(['approve', 'reject', 'mark_paid']),
      });
      const { id: companyId, orderId } = validateRequest(paramsSchema, request.params);
      const body = validateRequest(bodySchema, request.body);

      if (request.user.companyId !== companyId) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const [order] = await db
        .select()
        .from(schema.adOrders)
        .where(
          and(
            eq(schema.adOrders.id, orderId),
            eq(schema.adOrders.companyId, companyId)
          )
        )
        .limit(1);
      if (!order) {
        throw new NotFoundError('Ad order not found');
      }

      if (body.action === 'mark_paid') {
        await db
          .update(schema.adOrders)
          .set({ paymentStatus: 'paid', updatedAt: new Date() })
          .where(eq(schema.adOrders.id, orderId));
        return reply.send({ ok: true, paymentStatus: 'paid' });
      }

      if (body.action === 'reject') {
        await db
          .update(schema.adOrders)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(eq(schema.adOrders.id, orderId));
        return reply.send({ ok: true, status: 'rejected' });
      }

      // approve
      if (order.status !== 'pending_approval') {
        throw new ValidationError('Order is not pending approval', [
          { field: 'action', message: 'Only pending orders can be approved' },
        ]);
      }
      if (!order.imageStorageKey || !order.imagePublicUrl || !order.imageMimeType || order.imageBytes == null) {
        throw new ValidationError('Order has no image', [
          { field: 'image', message: 'Order must have an image to approve' },
        ]);
      }

      const shopIds: (number | null)[] =
        order.shopIds && Array.isArray(order.shopIds) && order.shopIds.length > 0
          ? (order.shopIds as number[])
          : [null];

      const maxPositionResult = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(${schema.companyAds.position}), 0)` })
        .from(schema.companyAds)
        .where(eq(schema.companyAds.companyId, companyId));
      const nextPosition = (maxPositionResult[0]?.maxPos ?? 0) + 1;

      for (let i = 0; i < shopIds.length; i++) {
        await db.insert(schema.companyAds).values({
          companyId,
          shopId: shopIds[i],
          position: nextPosition + i,
          enabled: true,
          mediaType: 'image',
          mimeType: order.imageMimeType,
          bytes: order.imageBytes,
          storageKey: order.imageStorageKey,
          publicUrl: order.imagePublicUrl,
        });
      }

      await db
        .update(schema.adOrders)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: request.user.id ?? null,
          updatedAt: new Date(),
        })
        .where(eq(schema.adOrders.id, orderId));

      return reply.send({ ok: true, status: 'approved' });
    }
  );
};
