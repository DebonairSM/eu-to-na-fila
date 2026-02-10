import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { env } from '../env.js';

let lastNominatimRequest = 0;

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
};
