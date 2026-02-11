import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { join } from 'path';
import { unlink, writeFile, mkdir } from 'fs/promises';
import { existsSync, readFileSync } from 'fs';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { hashPassword, validatePassword } from '../lib/password.js';
import { mergeHomeContent } from '../lib/homeContent.js';
import { DEFAULT_THEME } from '../lib/theme.js';
import { getPublicPath } from '../lib/paths.js';
import { deleteAdFile, uploadShopHomeImage, uploadDraftHomeImage } from '../lib/storage.js';
import { env } from '../env.js';
import { themeInputSchema, homeContentInputSchema, homeContentByLocaleInputSchema, shopSettingsInputSchema } from '@eutonafila/shared';

const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_HOME_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Company shop routes.
 * Handles shop CRUD under /companies/:id/shops/*.
 */
export const companyShopsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get barbershops for a company.
   * Requires company admin authentication.
   * 
   * @route GET /api/companies/:id/shops
   * @returns List of barbershops
   */
  fastify.get(
    '/companies/:id/shops',
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

      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      const shops = await db.query.shops.findMany({
        where: eq(schema.shops.companyId, id),
        orderBy: (shops, { asc }) => [asc(shops.name)],
      });

      return shops;
    }
  );

  /**
   * Create a new shop for a company.
   * 
   * @route POST /api/companies/:id/shops
   * @returns Created shop
   */
  fastify.post(
    '/companies/:id/shops',
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

      const bodySchema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional(),
        path: z.string().optional(),
        apiBase: z.string().url().optional(),
      });

      const body = validateRequest(bodySchema, request.body);

      // Generate slug from name if not provided
      let slug = body.slug;
      if (!slug) {
        slug = body.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
      }

      // Ensure project slug is globally unique
      let projectSlug = slug;
      let counter = 0;
      while (await db.query.projects.findFirst({ where: eq(schema.projects.slug, projectSlug) })) {
        counter++;
        projectSlug = `${slug}-${counter}`;
      }
      if (counter > 0) slug = projectSlug;

      const newShop = await db.transaction(async (tx) => {
        const [newProject] = await tx
          .insert(schema.projects)
          .values({
            slug: projectSlug,
            name: body.name,
            path: body.path || `/projects/${projectSlug}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const [shop] = await tx
          .insert(schema.shops)
          .values({
            projectId: newProject.id,
            companyId: id,
            slug,
            name: body.name,
            domain: body.domain || null,
            path: body.path || `/projects/${projectSlug}`,
            apiBase: body.apiBase || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        return shop;
      });

      return reply.status(201).send(newShop);
    }
  );

  /**
   * Update a shop.
   * 
   * @route PATCH /api/companies/:id/shops/:shopId
   * @returns Updated shop
   */
  fastify.patch(
    '/companies/:id/shops/:shopId',
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
        shopId: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id, shopId } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const bodySchema = z.object({
        name: z.string().min(1).max(200).optional(),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional().nullable(),
        path: z.string().optional().nullable(),
        apiBase: z.string().url().optional().nullable(),
        theme: themeInputSchema,
        homeContent: homeContentInputSchema,
        homeContentByLocale: homeContentByLocaleInputSchema,
        settings: shopSettingsInputSchema,
        ownerPassword: z.string().min(6).max(200).optional(),
        staffPassword: z.string().min(6).max(200).optional(),
      });

      const body = validateRequest(bodySchema, request.body);

      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });

      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      if (body.slug && body.slug !== shop.slug) {
        const existingShop = await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.projectId, shop.projectId),
            eq(schema.shops.slug, body.slug)
          ),
        });

        if (existingShop) {
          throw new ValidationError('Slug already exists', [
            { field: 'slug', message: 'This slug is already in use in this project' },
          ]);
        }
      }

      const updatePayload: Record<string, unknown> = {
        ...(body.name && { name: body.name }),
        ...(body.slug && { slug: body.slug }),
        ...(body.domain !== undefined && { domain: body.domain }),
        ...(body.path !== undefined && { path: body.path }),
        ...(body.apiBase !== undefined && { apiBase: body.apiBase }),
        updatedAt: new Date(),
      };

      if (body.theme !== undefined) {
        const existingTheme = shop.theme ? (JSON.parse(shop.theme) as Record<string, unknown>) : {};
        const nextTheme = { ...existingTheme, ...body.theme } as Record<string, unknown>;
        // Deep-merge nested style config so PATCH can update individual keys.
        if (existingTheme.style && body.theme.style) {
          nextTheme.style = {
            ...(existingTheme.style as Record<string, unknown>),
            ...(body.theme.style as Record<string, unknown>),
          };
        }
        updatePayload.theme = JSON.stringify(nextTheme);
      }

      if (body.homeContentByLocale !== undefined) {
        const record: Record<string, unknown> = {};
        for (const [locale, partial] of Object.entries(body.homeContentByLocale)) {
          if (partial != null && typeof partial === 'object') {
            const existing = (shop.homeContent as Record<string, unknown>)?.[locale] ?? {};
            record[locale] = mergeHomeContent({ ...(existing as object), ...partial });
          }
        }
        if (Object.keys(record).length > 0) {
          updatePayload.homeContent = record;
        }
      } else if (body.homeContent !== undefined) {
        const existing = (shop.homeContent ?? {}) as Record<string, unknown>;
        const merged = mergeHomeContent({ ...existing, ...body.homeContent });
        updatePayload.homeContent = { 'pt-BR': merged };
      }

      if (body.settings !== undefined) {
        const existing = (shop.settings ?? {}) as Record<string, unknown>;
        updatePayload.settings = { ...existing, ...body.settings };
      }

      if (body.ownerPassword !== undefined) {
        const ownerValidation = validatePassword(body.ownerPassword);
        if (!ownerValidation.isValid) {
          throw new ValidationError(ownerValidation.error ?? 'Invalid owner password');
        }
        updatePayload.ownerPinHash = await hashPassword(body.ownerPassword);
        updatePayload.ownerPin = null;
        updatePayload.ownerPinResetRequired = false;
      }

      if (body.staffPassword !== undefined) {
        const staffValidation = validatePassword(body.staffPassword);
        if (!staffValidation.isValid) {
          throw new ValidationError(staffValidation.error ?? 'Invalid staff password');
        }
        updatePayload.staffPinHash = await hashPassword(body.staffPassword);
        updatePayload.staffPin = null;
        updatePayload.staffPinResetRequired = false;
      }

      const [updatedShop] = await db
        .update(schema.shops)
        .set(updatePayload as Record<string, unknown>)
        .where(eq(schema.shops.id, shopId))
        .returning();

      return updatedShop;
    }
  );

  /**
   * Upload home page about image for an existing shop.
   * @route POST /api/companies/:id/shops/:shopId/home-image
   * @returns { url: string } Public URL for the image
   */
  fastify.post(
    '/companies/:id/shops/:shopId/home-image',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId == null) {
        return reply.status(403).send({ error: 'Company admin access required', statusCode: 403, code: 'FORBIDDEN' });
      }
      const paramsSchema = z.object({
        id: z.string().transform((v) => parseInt(v, 10)),
        shopId: z.string().transform((v) => parseInt(v, 10)),
      });
      const { id, shopId } = validateRequest(paramsSchema, request.params);
      if (request.user.companyId !== id) {
        return reply.status(403).send({ error: 'Access denied to this company', statusCode: 403, code: 'FORBIDDEN' });
      }
      const shop = await db.query.shops.findFirst({
        where: and(eq(schema.shops.id, shopId), eq(schema.shops.companyId, id)),
      });
      if (!shop) throw new NotFoundError('Shop not found');

      let fileBuffer: Buffer | null = null;
      let fileMimetype: string | null = null;
      let fileBytesRead = 0;
      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'file') {
            fileBuffer = await part.toBuffer();
            fileMimetype = part.mimetype ?? null;
            fileBytesRead = part.file.bytesRead;
          }
        }
      } catch (err) {
        request.log.error({ err }, 'Error parsing multipart');
        throw new ValidationError('Invalid upload data', [{ field: 'file', message: 'File is required' }]);
      }
      if (!fileBuffer || !fileMimetype || !ALLOWED_IMAGE_MIME.includes(fileMimetype)) {
        throw new ValidationError('A valid image file (PNG, JPEG, WebP) is required', [{ field: 'file', message: 'Invalid file type' }]);
      }
      if (fileBytesRead > MAX_HOME_IMAGE_SIZE) {
        throw new ValidationError('File too large. Maximum size: 5MB', [{ field: 'file', message: 'File too large' }]);
      }
      const mimeToExt: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp' };
      const extension = mimeToExt[fileMimetype] || '.jpg';

      let url: string;
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        url = await uploadShopHomeImage(id, shopId, fileBuffer, fileMimetype);
      } else {
        const publicPath = getPublicPath();
        const dir = join(publicPath, 'companies', id.toString(), 'shops', shopId.toString());
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        const filePath = join(dir, `home-about${extension}`);
        await writeFile(filePath, fileBuffer);
        const host = request.headers['host'] ?? 'localhost';
        const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const base = `${protocol}://${host}`;
        url = `${base}/api/companies/${id}/shops/${shopId}/home-image`;
      }
      return reply.send({ url });
    }
  );

  /**
   * Serve uploaded home about image (local storage fallback).
   * @route GET /api/companies/:id/shops/:shopId/home-image
   */
  fastify.get(
    '/companies/:id/shops/:shopId/home-image',
    async (request, reply) => {
      const getParamsSchema = z.object({
        id: z.string().transform((v) => parseInt(v, 10)),
        shopId: z.string().transform((v) => parseInt(v, 10)),
      });
      const { id, shopId } = validateRequest(getParamsSchema, request.params);
      const publicPath = getPublicPath();
      const dir = join(publicPath, 'companies', id.toString(), 'shops', shopId.toString());
      const exts = ['.png', '.jpg', '.jpeg', '.webp'];
      let content: Buffer | null = null;
      let contentType = 'image/jpeg';
      for (const ext of exts) {
        const filePath = join(dir, `home-about${ext}`);
        if (existsSync(filePath)) {
          content = readFileSync(filePath);
          contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          break;
        }
      }
      if (!content) return reply.code(404).send({ error: 'Not found' });
      return reply.type(contentType).send(content);
    }
  );

  /**
   * Upload draft home about image (for create-shop flow; no shop yet).
   * @route POST /api/companies/:id/uploads/home-about
   * @returns { url: string } Public URL for the image
   */
  fastify.post(
    '/companies/:id/uploads/home-about',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      if (!request.user || request.user.companyId == null) {
        return reply.status(403).send({ error: 'Company admin access required', statusCode: 403, code: 'FORBIDDEN' });
      }
      const draftParamsSchema = z.object({ id: z.string().transform((v) => parseInt(v, 10)) });
      const { id } = validateRequest(draftParamsSchema, request.params);
      if (request.user.companyId !== id) {
        return reply.status(403).send({ error: 'Access denied to this company', statusCode: 403, code: 'FORBIDDEN' });
      }
      let fileBuffer: Buffer | null = null;
      let fileMimetype: string | null = null;
      let fileBytesRead = 0;
      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'file') {
            fileBuffer = await part.toBuffer();
            fileMimetype = part.mimetype ?? null;
            fileBytesRead = part.file.bytesRead;
          }
        }
      } catch (err) {
        request.log.error({ err }, 'Error parsing multipart');
        throw new ValidationError('Invalid upload data', [{ field: 'file', message: 'File is required' }]);
      }
      if (!fileBuffer || !fileMimetype || !ALLOWED_IMAGE_MIME.includes(fileMimetype)) {
        throw new ValidationError('A valid image file (PNG, JPEG, WebP) is required', [{ field: 'file', message: 'Invalid file type' }]);
      }
      if (fileBytesRead > MAX_HOME_IMAGE_SIZE) {
        throw new ValidationError('File too large. Maximum size: 5MB', [{ field: 'file', message: 'File too large' }]);
      }
      const mimeToExt: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp' };
      const extension = mimeToExt[fileMimetype] || '.jpg';

      let url: string;
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        url = await uploadDraftHomeImage(id, fileBuffer, fileMimetype);
      } else {
        const publicPath = getPublicPath();
        const dir = join(publicPath, 'companies', id.toString(), 'drafts');
        if (!existsSync(dir)) await mkdir(dir, { recursive: true });
        const uuid = crypto.randomUUID();
        const filename = `home-about-${uuid}${extension}`;
        const filePath = join(dir, filename);
        await writeFile(filePath, fileBuffer);
        const host = request.headers['host'] ?? 'localhost';
        const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const base = `${protocol}://${host}`;
        url = `${base}/api/companies/${id}/drafts/home-about/${filename}`;
      }
      return reply.send({ url });
    }
  );

  /**
   * Serve draft home about image (local storage fallback for create flow).
   * @route GET /api/companies/:id/drafts/home-about/:filename
   */
  fastify.get(
    '/companies/:id/drafts/home-about/:filename',
    async (request, reply) => {
      const draftGetParamsSchema = z.object({
        id: z.string().transform((v) => parseInt(v, 10)),
        filename: z.string().min(1).max(200),
      });
      const { id, filename } = validateRequest(draftGetParamsSchema, request.params);
      if (!/^home-about-[a-f0-9-]+\.(png|jpg|jpeg|webp)$/i.test(filename)) {
        return reply.code(404).send({ error: 'Not found' });
      }
      const publicPath = getPublicPath();
      const filePath = join(publicPath, 'companies', id.toString(), 'drafts', filename);
      if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
      const content = readFileSync(filePath);
      const ext = filename.split('.').pop()?.toLowerCase();
      const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return reply.type(contentType).send(content);
    }
  );

  /** Normalize barber username for storage (trim + lowercase). */
  const normalizeBarberUsername = (u: string) => u.trim().toLowerCase();
  const barberUsernameRegex = /^[a-zA-Z0-9_.-]+$/;

  /**
   * Update a barber's login credentials (username and/or password).
   * Company admin only. Used when setting up barber access in the shop Access tab.
   *
   * @route PATCH /api/companies/:id/shops/:shopId/barbers/:barberId
   * @body username - Optional; set to empty string or omit to clear
   * @body password - Optional; leave empty to not change
   */
  fastify.patch(
    '/companies/:id/shops/:shopId/barbers/:barberId',
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
        shopId: z.string().transform((val) => parseInt(val, 10)),
        barberId: z.string().transform((val) => parseInt(val, 10)),
      });
      const bodySchema = z.object({
        username: z.string().max(100).optional().nullable(),
        password: z.string().min(1).max(200).optional(),
      });

      const { id, shopId, barberId } = validateRequest(paramsSchema, request.params);
      const body = validateRequest(bodySchema, request.body);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });
      if (!shop) throw new NotFoundError('Shop not found');

      const barber = await db.query.barbers.findFirst({
        where: and(
          eq(schema.barbers.id, barberId),
          eq(schema.barbers.shopId, shopId)
        ),
      });
      if (!barber) throw new NotFoundError('Barber not found');

      const updatePayload: { username?: string | null; passwordHash?: string | null; updatedAt: Date } = {
        updatedAt: new Date(),
      };

      if (body.username !== undefined) {
        if (body.username === null || String(body.username).trim() === '') {
          updatePayload.username = null;
          updatePayload.passwordHash = null;
        } else {
          const trimmed = String(body.username).trim();
          if (trimmed.length > 100) throw new ValidationError('Username must be at most 100 characters');
          if (!barberUsernameRegex.test(trimmed)) throw new ValidationError('Username can only contain letters, numbers, underscore, hyphen and period');
          updatePayload.username = normalizeBarberUsername(trimmed);
        }
      }

      if (body.password !== undefined && body.password !== '') {
        const pwValidation = validatePassword(body.password);
        if (!pwValidation.isValid) throw new ValidationError(pwValidation.error ?? 'Invalid password');
        updatePayload.passwordHash = await hashPassword(body.password);
      }

      await db
        .update(schema.barbers)
        .set(updatePayload as Record<string, unknown>)
        .where(eq(schema.barbers.id, barberId));

      const [updated] = await db.query.barbers.findMany({
        where: eq(schema.barbers.id, barberId),
        columns: { id: true, shopId: true, name: true, username: true, isActive: true, isPresent: true },
      });
      return updated ?? { id: barber.id, shopId: barber.shopId, name: barber.name, username: barber.username, isActive: barber.isActive, isPresent: barber.isPresent };
    }
  );

  /**
   * Delete a shop.
   * 
   * @route DELETE /api/companies/:id/shops/:shopId
   * @returns Success message
   */
  fastify.delete(
    '/companies/:id/shops/:shopId',
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
        shopId: z.string().transform((val) => parseInt(val, 10)),
      });

      const { id, shopId } = validateRequest(paramsSchema, request.params);

      if (request.user.companyId !== id) {
        return reply.status(403).send({
          error: 'Access denied to this company',
          statusCode: 403,
          code: 'FORBIDDEN',
        });
      }

      const shop = await db.query.shops.findFirst({
        where: and(
          eq(schema.shops.id, shopId),
          eq(schema.shops.companyId, id)
        ),
      });

      if (!shop) {
        throw new NotFoundError('Shop not found');
      }

      const projectId = shop.projectId;

      const shopAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, id),
          eq(schema.companyAds.shopId, shopId)
        ),
      });
      const publicPath = getPublicPath();
      for (const ad of shopAds) {
        try {
          if (ad.publicUrl) {
            if (ad.publicUrl.startsWith('http://') || ad.publicUrl.startsWith('https://')) {
              if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && ad.mimeType) {
                await deleteAdFile(ad.companyId, ad.id, ad.mimeType);
                request.log.info({ adId: ad.id }, 'Deleted ad file from Supabase Storage');
              }
            } else {
              const urlParts = ad.publicUrl.split('/');
              const filename = urlParts[urlParts.length - 1];
              const companyId = ad.companyId.toString();
              const filePath = join(publicPath, 'companies', companyId, 'ads', filename);
              if (existsSync(filePath)) {
                await unlink(filePath);
                request.log.info({ adId: ad.id, filePath }, 'Deleted ad file from filesystem');
              }
            }
          }
        } catch (fileError) {
          request.log.warn({ err: fileError, adId: ad.id }, 'Error deleting ad file from storage');
        }
      }

      await db.transaction(async (tx) => {
        await tx.delete(schema.auditLog).where(eq(schema.auditLog.shopId, shopId));
        await tx.delete(schema.tickets).where(eq(schema.tickets.shopId, shopId));
        await tx.delete(schema.barberServiceWeekdayStats).where(eq(schema.barberServiceWeekdayStats.shopId, shopId));
        await tx.delete(schema.services).where(eq(schema.services.shopId, shopId));
        await tx.delete(schema.barbers).where(eq(schema.barbers.shopId, shopId));
        await tx.delete(schema.companyAds).where(eq(schema.companyAds.shopId, shopId));
        await tx.delete(schema.shops).where(eq(schema.shops.id, shopId));
        await tx.delete(schema.projects).where(eq(schema.projects.id, projectId));
      });

      return reply.status(200).send({
        success: true,
        message: 'Shop deleted successfully',
      });
    }
  );

  /**
   * Create a full shop with services and barbers in a single transaction.
   *
   * @route POST /api/companies/:id/shops/full
   * @returns Created shop, services, and barbers
   */
  fastify.post(
    '/companies/:id/shops/full',
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

      const bodySchema = z.object({
        name: z.string().min(1).max(200),
        slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
        domain: z.string().optional(),
        ownerPassword: z.string().min(6).max(200).optional(),
        staffPassword: z.string().min(6).max(200).optional(),
        theme: themeInputSchema,
        homeContent: homeContentInputSchema,
        homeContentByLocale: homeContentByLocaleInputSchema,
        settings: shopSettingsInputSchema,
        services: z.array(z.object({
          name: z.string().min(1).max(200),
          description: z.string().max(500).optional(),
          duration: z.number().int().positive(),
          price: z.number().int().nonnegative().optional(),
        })).min(1),
        barbers: z.array(z.object({
          name: z.string().min(1).max(100),
          email: z.string().email().optional().or(z.literal('')),
          phone: z.string().optional().or(z.literal('')),
        })).min(1),
      });

      const body = validateRequest(bodySchema, request.body);

      let slug = body.slug;
      if (!slug) {
        slug = body.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
      }

      let projectSlug = slug;
      let counter = 0;
      while (await db.query.projects.findFirst({ where: eq(schema.projects.slug, projectSlug) })) {
        counter++;
        projectSlug = `${slug}-${counter}`;
      }
      if (counter > 0) slug = projectSlug;

      const ownerPassword = body.ownerPassword ?? '123456';
      const staffPassword = body.staffPassword ?? '000000';
      const ownerValidation = validatePassword(ownerPassword);
      const staffValidation = validatePassword(staffPassword);
      if (!ownerValidation.isValid) throw new ValidationError(ownerValidation.error ?? 'Invalid owner password');
      if (!staffValidation.isValid) throw new ValidationError(staffValidation.error ?? 'Invalid staff password');
      const ownerPinHash = await hashPassword(ownerPassword);
      const staffPinHash = await hashPassword(staffPassword);

      const result = await db.transaction(async (tx) => {
        const [newProject] = await tx
          .insert(schema.projects)
          .values({
            slug: projectSlug,
            name: body.name,
            path: `/projects/${projectSlug}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const themeToStore = body.theme ? { ...DEFAULT_THEME, ...body.theme } : DEFAULT_THEME;
        let homeContentToStore: Record<string, unknown> | null = null;
        if (body.homeContentByLocale !== undefined && Object.keys(body.homeContentByLocale).length > 0) {
          homeContentToStore = {};
          for (const [locale, partial] of Object.entries(body.homeContentByLocale)) {
            if (partial != null && typeof partial === 'object') {
              homeContentToStore[locale] = mergeHomeContent(partial);
            }
          }
          if (Object.keys(homeContentToStore).length === 0) homeContentToStore = null;
        } else if (body.homeContent) {
          homeContentToStore = { 'pt-BR': mergeHomeContent(body.homeContent) };
        }

        const [newShop] = await tx
          .insert(schema.shops)
          .values({
            projectId: newProject.id,
            companyId: id,
            slug,
            name: body.name,
            domain: body.domain || null,
            path: `/projects/${projectSlug}`,
            apiBase: null,
            theme: JSON.stringify(themeToStore),
            homeContent: homeContentToStore,
            settings: body.settings ?? null,
            ownerPinHash,
            staffPinHash,
            ownerPinResetRequired: false,
            staffPinResetRequired: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        const newServices = await tx
          .insert(schema.services)
          .values(
            body.services.map((s) => ({
              shopId: newShop.id,
              name: s.name,
              description: s.description || null,
              duration: s.duration,
              price: s.price ?? null,
              isActive: true,
            }))
          )
          .returning();

        const newBarbers = await tx
          .insert(schema.barbers)
          .values(
            body.barbers.map((b) => ({
              shopId: newShop.id,
              name: b.name,
              email: b.email || null,
              phone: b.phone || null,
              isActive: true,
              isPresent: true,
            }))
          )
          .returning();

        return { shop: newShop, services: newServices, barbers: newBarbers };
      });

      return reply.status(201).send(result);
    }
  );
};
