import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { join } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { getShopBySlug } from '../lib/shop.js';
import { clientService } from '../services/index.js';
import { uploadClientReferenceImage } from '../lib/storage.js';
import { getPublicPath } from '../lib/paths.js';
import { env } from '../env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ValidationError, ConflictError, NotFoundError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword, validatePassword } from '../lib/password.js';
import { getKioskPasswordHash } from '../lib/settings.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { logAuthFailure, logAuthSuccess, getClientIp } from '../middleware/security.js';

/**
 * Auth routes.
 * Owner/staff: password-based authentication. Barber: username + password.
 */
export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Debug: returns the Google OAuth redirect URI the app would use.
   * Compare with Authorized redirect URIs in Google Cloud Console.
   * @route GET /api/auth/debug/google-redirect-uri
   */
  fastify.get('/auth/debug/google-redirect-uri', async (request, reply) => {
    const callbackPath = '/api/auth/customer/google/callback';
    const baseUrl = env.PUBLIC_API_URL
      ? env.PUBLIC_API_URL.replace(/\/$/, '')
      : (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-host']
          ? `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}`
          : `${request.protocol}://${request.headers.host || request.hostname}`);
    const redirectUri = `${baseUrl}${callbackPath}`;
    return {
      redirectUri,
      configured: !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET,
      publicApiUrl: env.PUBLIC_API_URL ?? null,
      corsOrigin: env.CORS_ORIGIN,
    };
  });

  // Brute force protection: more lenient in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxAttempts = isDevelopment ? 100 : 30;

  const authRateLimit = createRateLimit({
    max: maxAttempts,
    timeWindow: '15 minutes',
    keyGenerator: (request) => {
      const ip = getClientIp(request);
      const slug = (request.params as { slug?: string })?.slug || 'unknown';
      return `${ip}:${slug}`;
    },
  });

  /**
   * Verify shop password (owner or staff) and issue JWT token.
   *
   * @route POST /api/shops/:slug/auth
   * @body password - Owner or staff password
   * @returns { valid, role, token?, pinResetRequired? }
   */
  fastify.post('/shops/:slug/auth', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { password } = validateRequest(bodySchema, request.body);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logAuthFailure(request, 'invalid_password_format', slug);
      throw new ValidationError(passwordValidation.error || 'Invalid password format');
    }

    const shop = await getShopBySlug(slug);

    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    let role: 'owner' | 'staff' | null = null;
    let passwordMatches = false;
    let pinResetRequired = false;

    if (shop.ownerPinHash) {
      const matches = await verifyPassword(password, shop.ownerPinHash);
      if (matches) {
        role = 'owner';
        passwordMatches = true;
        pinResetRequired = shop.ownerPinResetRequired || false;
      }
    } else if (shop.ownerPin === password) {
      role = 'owner';
      passwordMatches = true;
      pinResetRequired = true;
    }

    if (!passwordMatches && shop.staffPinHash) {
      const matches = await verifyPassword(password, shop.staffPinHash);
      if (matches) {
        role = 'staff';
        passwordMatches = true;
        pinResetRequired = shop.staffPinResetRequired || false;
      }
    } else if (!passwordMatches && shop.staffPin === password) {
      role = 'staff';
      passwordMatches = true;
      pinResetRequired = true;
    }

    if (!passwordMatches || !role) {
      logAuthFailure(request, 'invalid_password', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, role);

    const token = signToken({
      userId: shop.id,
      shopId: shop.id,
      role,
    } as { userId: number; shopId: number; role: 'owner' | 'staff' });

    return {
      valid: true,
      role,
      token,
      pinResetRequired,
    };
  });

  /**
   * Barber login: username + password. Issues JWT with role 'barber'.
   *
   * @route POST /api/shops/:slug/auth/barber
   * @body username - Barber username (unique per shop)
   * @body password - Barber password
   * @returns { valid, role: 'barber', token?, barberName?, pinResetRequired?: false }
   */
  fastify.post('/shops/:slug/auth/barber', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { username, password } = validateRequest(bodySchema, request.body);

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logAuthFailure(request, 'invalid_password_format', slug);
      throw new ValidationError(passwordValidation.error || 'Invalid password format');
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    const usernameNormalized = username.trim().toLowerCase();
    const barber = await db.query.barbers.findFirst({
      where: and(
        eq(schema.barbers.shopId, shop.id),
        eq(schema.barbers.username, usernameNormalized)
      ),
    });

    if (!barber || !barber.passwordHash) {
      logAuthFailure(request, 'invalid_barber_login', slug);
      return { valid: false, role: null };
    }

    const passwordMatches = await verifyPassword(password, barber.passwordHash);
    if (!passwordMatches) {
      logAuthFailure(request, 'invalid_barber_login', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, 'barber');

    const token = signToken({
      userId: barber.id,
      shopId: barber.shopId,
      role: 'barber',
      barberId: barber.id,
    });

    return {
      valid: true,
      role: 'barber' as const,
      token,
      barberId: barber.id,
      barberName: barber.name,
      pinResetRequired: false,
    };
  });

  /**
   * Kiosk-only login: username + password from shop settings.
   * Issues JWT with role 'kiosk' for display-only queue/barber view.
   *
   * @route POST /api/shops/:slug/auth/kiosk
   * @body username - Kiosk username (from shop settings)
   * @body password - Kiosk password
   * @returns { valid, role: 'kiosk', token? }
   */
  fastify.post('/shops/:slug/auth/kiosk', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({
      slug: z.string().min(1).max(100),
    });
    const bodySchema = z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    });

    const { slug } = validateRequest(paramsSchema, request.params);
    const { username, password } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    const settings = shop.settings as Record<string, unknown> | null;
    const kioskUsername = settings?.kioskUsername;
    const kioskPasswordHash = getKioskPasswordHash(shop.settings);
    const kioskPasswordPlain = typeof settings?.kioskPassword === 'string' ? settings.kioskPassword : null;

    if (typeof kioskUsername !== 'string' || !kioskUsername.trim()) {
      logAuthFailure(request, 'invalid_kiosk_login', slug);
      return { valid: false, role: null };
    }

    const usernameMatch = username.trim() === kioskUsername.trim();
    let passwordMatches = false;
    if (kioskPasswordHash) {
      passwordMatches = await verifyPassword(password, kioskPasswordHash);
    } else if (kioskPasswordPlain) {
      passwordMatches = password === kioskPasswordPlain;
    }

    if (!usernameMatch || !passwordMatches) {
      logAuthFailure(request, 'invalid_kiosk_login', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, 'kiosk');

    const token = signToken({
      userId: shop.id,
      shopId: shop.id,
      role: 'kiosk',
    });

    return {
      valid: true,
      role: 'kiosk' as const,
      token,
    };
  });

  // --- Customer auth (email/password + Google) ---
  const customerRateLimit = createRateLimit({
    max: isDevelopment ? 50 : 20,
    timeWindow: '15 minutes',
    keyGenerator: (request) => {
      const ip = getClientIp(request);
      const slug = (request.params as { slug?: string })?.slug || 'unknown';
      return `customer:${ip}:${slug}`;
    },
  });

  function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Customer register: email + password. Creates client or sets password on existing (no password yet).
   *
   * @route POST /api/shops/:slug/auth/customer/register
   * @body email, password, name?
   */
  fastify.post('/shops/:slug/auth/customer/register', {
    preHandler: [customerRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const bodySchema = z.object({
      email: z.string().email('Invalid email'),
      password: z.string().min(1).max(200),
      name: z.string().max(200).optional(),
    });
    const { slug } = validateRequest(paramsSchema, request.params);
    const body = validateRequest(bodySchema, request.body);

    const pwValidation = validatePassword(body.password);
    if (!pwValidation.isValid) {
      throw new ValidationError(pwValidation.error || 'Invalid password');
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return reply.status(404).send({ valid: false, error: 'Shop not found' });
    }

    const normalizedEmail = normalizeEmail(body.email);
    const phonePlaceholder = `e:${normalizedEmail}`;

    const existing = await db.query.clients.findFirst({
      where: and(
        eq(schema.clients.shopId, shop.id),
        eq(schema.clients.email, normalizedEmail)
      ),
    });

    if (existing) {
      if (existing.passwordHash) {
        logAuthFailure(request, 'customer_email_taken', slug);
        throw new ConflictError('This email is already registered. Log in or reset password.');
      }
      const passwordHash = await hashPassword(body.password);
      const name = (body.name && body.name.trim()) || existing.name;
      await db.update(schema.clients).set({
        name,
        passwordHash,
        updatedAt: new Date(),
      }).where(eq(schema.clients.id, existing.id));

      logAuthSuccess(request, shop.id, 'customer');
      const token = signToken({
        userId: existing.id,
        shopId: shop.id,
        role: 'customer',
        clientId: existing.id,
      });
      return { valid: true, role: 'customer', token, clientId: existing.id, name: name || existing.name };
    }

    const passwordHash = await hashPassword(body.password);
    const name = (body.name && body.name.trim()) || normalizedEmail.split('@')[0] || 'Customer';
    const [created] = await db.insert(schema.clients).values({
      shopId: shop.id,
      phone: phonePlaceholder,
      name,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (!created) throw new ValidationError('Failed to create account');
    logAuthSuccess(request, shop.id, 'customer');
    const token = signToken({
      userId: created.id,
      shopId: shop.id,
      role: 'customer',
      clientId: created.id,
    });
    return reply.status(201).send({ valid: true, role: 'customer', token, clientId: created.id, name: created.name });
  });

  /**
   * Customer login: email + password.
   *
   * @route POST /api/shops/:slug/auth/customer/login
   * @body email, password, remember_me (optional)
   */
  fastify.post('/shops/:slug/auth/customer/login', {
    preHandler: [customerRateLimit],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const bodySchema = z.object({
      email: z.string().email('Invalid email'),
      password: z.string().min(1).max(200),
      remember_me: z.boolean().optional(),
    });
    const { slug } = validateRequest(paramsSchema, request.params);
    const { email, password, remember_me } = validateRequest(bodySchema, request.body);

    const shop = await getShopBySlug(slug);
    if (!shop) {
      logAuthFailure(request, 'shop_not_found', slug);
      return { valid: false, role: null };
    }

    const normalizedEmail = normalizeEmail(email);
    const client = await db.query.clients.findFirst({
      where: and(
        eq(schema.clients.shopId, shop.id),
        eq(schema.clients.email, normalizedEmail)
      ),
    });

    if (!client || !client.passwordHash) {
      logAuthFailure(request, 'invalid_customer_login', slug);
      return { valid: false, role: null };
    }

    const matches = await verifyPassword(password, client.passwordHash);
    if (!matches) {
      logAuthFailure(request, 'invalid_customer_login', slug);
      return { valid: false, role: null };
    }

    logAuthSuccess(request, shop.id, 'customer');
    const token = signToken(
      {
        userId: client.id,
        shopId: shop.id,
        role: 'customer',
        clientId: client.id,
      },
      { expiresIn: remember_me === true ? '7d' : '24h' }
    );
    return {
      valid: true,
      role: 'customer' as const,
      token,
      clientId: client.id,
      name: client.name,
    };
  });

  /**
   * Get current customer profile (name, email, phone). Customer must be authenticated.
   *
   * @route GET /api/shops/:slug/auth/customer/me
   */
  fastify.get('/shops/:slug/auth/customer/me', {
    preHandler: [requireAuth(), requireRole(['customer'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const clientId = request.user?.clientId;
    if (!clientId) throw new ValidationError('Invalid customer token');

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError('Shop not found');

    const client = await db.query.clients.findFirst({
      where: and(
        eq(schema.clients.id, clientId),
        eq(schema.clients.shopId, shop.id)
      ),
    });
    if (!client) throw new NotFoundError('Client not found');

    const phone = client.phone?.startsWith('e:') ? null : client.phone;
    const prefs = (client as { preferences?: { emailReminders?: boolean } }).preferences ?? {};
    const address = (client as { address?: string | null }).address ?? null;
    const state = (client as { state?: string | null }).state ?? null;
    const city = (client as { city?: string | null }).city ?? null;
    const dateOfBirth = (client as { dateOfBirth?: Date | string | null }).dateOfBirth ?? null;
    const gender = (client as { gender?: string | null }).gender ?? null;
    return {
      name: client.name,
      email: client.email ?? null,
      phone,
      preferences: { emailReminders: prefs.emailReminders ?? true },
      nextServiceNote: (client as { nextServiceNote?: string | null }).nextServiceNote ?? null,
      nextServiceImageUrl: (client as { nextServiceImageUrl?: string | null }).nextServiceImageUrl ?? null,
      address,
      state,
      city,
      dateOfBirth: dateOfBirth ? (typeof dateOfBirth === 'string' ? dateOfBirth : dateOfBirth.toISOString().slice(0, 10)) : null,
      gender,
    };
  });

  /**
   * Update current customer profile (name, phone, preferences, reference, demographics).
   * @route PATCH /api/shops/:slug/auth/customer/me
   */
  fastify.patch('/shops/:slug/auth/customer/me', {
    preHandler: [requireAuth(), requireRole(['customer'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const clientId = request.user?.clientId;
    if (!clientId) throw new ValidationError('Invalid customer token');

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError('Shop not found');

    const bodySchema = z.object({
      name: z.string().min(1).max(200).optional(),
      phone: z.string().max(50).nullable().optional(),
      preferences: z.object({ emailReminders: z.boolean().optional() }).optional(),
      nextServiceNote: z.string().max(2000).nullable().optional(),
      nextServiceImageUrl: z.string().url().max(500).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      state: z.string().max(2).nullable().optional(),
      city: z.string().max(200).nullable().optional(),
      dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      gender: z.string().max(50).nullable().optional(),
    });
    const data = validateRequest(bodySchema, request.body);

    const updateData: Parameters<typeof clientService.updateCustomerProfile>[2] = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.preferences !== undefined) updateData.preferences = data.preferences;
    if (data.nextServiceNote !== undefined) updateData.nextServiceNote = data.nextServiceNote;
    if (data.nextServiceImageUrl !== undefined) updateData.nextServiceImageUrl = data.nextServiceImageUrl;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.gender !== undefined) updateData.gender = data.gender;

    const client = await clientService.updateCustomerProfile(clientId, shop.id, updateData);
    const phone = client.phone?.startsWith('e:') ? null : client.phone;
    const prefs = (client as { preferences?: { emailReminders?: boolean } }).preferences ?? {};
    const resAddress = (client as { address?: string | null }).address ?? null;
    const resState = (client as { state?: string | null }).state ?? null;
    const resCity = (client as { city?: string | null }).city ?? null;
    const resDateOfBirth = (client as { dateOfBirth?: Date | string | null }).dateOfBirth ?? null;
    const resGender = (client as { gender?: string | null }).gender ?? null;
    return {
      name: client.name,
      email: client.email ?? null,
      phone,
      preferences: { emailReminders: prefs.emailReminders ?? true },
      nextServiceNote: (client as { nextServiceNote?: string | null }).nextServiceNote ?? null,
      nextServiceImageUrl: (client as { nextServiceImageUrl?: string | null }).nextServiceImageUrl ?? null,
      address: resAddress,
      state: resState,
      city: resCity,
      dateOfBirth: resDateOfBirth ? (typeof resDateOfBirth === 'string' ? resDateOfBirth : (resDateOfBirth as Date).toISOString().slice(0, 10)) : null,
      gender: resGender,
    };
  });

  /**
   * Upload client reference image (for next service).
   * @route POST /api/shops/:slug/auth/customer/me/reference/upload
   */
  const ALLOWED_IMAGE_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const MAX_REFERENCE_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  fastify.post('/shops/:slug/auth/customer/me/reference/upload', {
    preHandler: [requireAuth(), requireRole(['customer'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const clientId = request.user?.clientId;
    if (!clientId) throw new ValidationError('Invalid customer token');

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError('Shop not found');

    const client = await clientService.getByIdWithShopCheck(clientId, shop.id);
    if (!client) throw new NotFoundError('Client not found');

    let fileBuffer: Buffer | null = null;
    let fileMimetype: string | null = null;
    let fileBytesRead = 0;
    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          fileBuffer = await part.toBuffer();
          fileMimetype = part.mimetype ?? null;
          fileBytesRead = fileBuffer.length;
        }
      }
    } catch (err) {
      request.log.error({ err }, 'Error parsing multipart');
      throw new ValidationError('Invalid upload data', [{ field: 'file', message: 'File is required' }]);
    }
    if (!fileBuffer || !fileMimetype || !ALLOWED_IMAGE_MIME.includes(fileMimetype)) {
      throw new ValidationError('A valid image file (PNG, JPEG, WebP) is required', [{ field: 'file', message: 'Invalid file type' }]);
    }
    if (fileBytesRead > MAX_REFERENCE_IMAGE_SIZE) {
      throw new ValidationError('File too large. Maximum size: 5MB', [{ field: 'file', message: 'File too large' }]);
    }

    const mimeToExt: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/webp': '.webp' };
    const extension = mimeToExt[fileMimetype] || '.jpg';

    let url: string;
    const companyId = (shop as { companyId?: number | null }).companyId;

    if (companyId != null && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      url = await uploadClientReferenceImage(companyId, shop.id, clientId, fileBuffer, fileMimetype);
    } else {
      const publicPath = getPublicPath();
      const dir = companyId != null
        ? join(publicPath, 'companies', String(companyId), 'shops', String(shop.id), 'clients', String(clientId))
        : join(publicPath, 'shops', String(shop.id), 'clients', String(clientId));
      if (!existsSync(dir)) await mkdir(dir, { recursive: true });
      const filePath = join(dir, `reference${extension}`);
      await writeFile(filePath, fileBuffer);
      const host = request.headers['host'] ?? 'localhost';
      const protocol = request.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const base = `${protocol}://${host}`;
      url = `${base}/api/shops/${encodeURIComponent(slug)}/auth/customer/me/reference/image`;
    }

    await clientService.updateCustomerProfile(clientId, shop.id, { nextServiceImageUrl: url });
    return reply.send({ url });
  });

  /**
   * Serve client reference image (local storage fallback).
   * @route GET /api/shops/:slug/auth/customer/me/reference/image
   */
  fastify.get('/shops/:slug/auth/customer/me/reference/image', {
    preHandler: [requireAuth(), requireRole(['customer'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const clientId = request.user?.clientId;
    if (!clientId) throw new ValidationError('Invalid customer token');

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError('Shop not found');

    const client = await clientService.getByIdWithShopCheck(clientId, shop.id);
    if (!client) throw new NotFoundError('Client not found');

    const storedUrl = (client as { nextServiceImageUrl?: string | null }).nextServiceImageUrl;
    if (!storedUrl || !storedUrl.includes('/reference/image')) {
      return reply.status(404).send({ error: 'No reference image' });
    }

    const { readFileSync } = await import('fs');
    const publicPath = getPublicPath();
    const companyId = (shop as { companyId?: number | null }).companyId;
    const dir = companyId != null
      ? join(publicPath, 'companies', String(companyId), 'shops', String(shop.id), 'clients', String(clientId))
      : join(publicPath, 'shops', String(shop.id), 'clients', String(clientId));
    const exts = ['.png', '.jpg', '.jpeg', '.webp'];
    for (const ext of exts) {
      const filePath = join(dir, `reference${ext}`);
      if (existsSync(filePath)) {
        const content = readFileSync(filePath);
        const contentType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return reply.type(contentType).send(content);
      }
    }
    return reply.status(404).send({ error: 'Not found' });
  });

  /**
   * Get current customer's appointments and tickets (upcoming + past).
   *
   * @route GET /api/shops/:slug/auth/customer/me/appointments
   */
  fastify.get('/shops/:slug/auth/customer/me/appointments', {
    preHandler: [requireAuth(), requireRole(['customer'])],
  }, async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const clientId = request.user?.clientId;
    if (!clientId) throw new ValidationError('Invalid customer token');

    const shop = await getShopBySlug(slug);
    if (!shop) throw new NotFoundError('Shop not found');

    const tickets = await db.query.tickets.findMany({
      where: and(
        eq(schema.tickets.clientId, clientId),
        eq(schema.tickets.shopId, shop.id)
      ),
      with: { service: { columns: { name: true } }, barber: { columns: { name: true } } },
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 100,
    });

    const upcoming = tickets.filter(
      (t) => t.status === 'pending' || t.status === 'waiting' || t.status === 'in_progress'
    );
    const past = tickets.filter(
      (t) => t.status === 'completed' || t.status === 'cancelled'
    );

    return {
      upcoming: upcoming.map((t) => ({
        id: t.id,
        status: t.status,
        type: (t as { type?: string }).type ?? 'walkin',
        customerName: t.customerName,
        serviceName: (t.service as { name?: string })?.name ?? null,
        barberName: (t.barber as { name?: string })?.name ?? null,
        scheduledTime: t.scheduledTime,
        position: t.position,
        estimatedWaitTime: t.estimatedWaitTime,
        ticketNumber: t.ticketNumber,
        createdAt: t.createdAt,
      })),
      past: past.map((t) => ({
        id: t.id,
        status: t.status,
        type: (t as { type?: string }).type ?? 'walkin',
        customerName: t.customerName,
        serviceName: (t.service as { name?: string })?.name ?? null,
        barberName: (t.barber as { name?: string })?.name ?? null,
        scheduledTime: t.scheduledTime,
        completedAt: t.completedAt,
        ticketNumber: t.ticketNumber,
        createdAt: t.createdAt,
      })),
    };
  });

  /**
   * Redirect to Google OAuth for customer Sign in with Google.
   *
   * @route GET /api/shops/:slug/auth/customer/google
   * @query redirect_uri - Frontend URL to redirect after auth (optional)
   */
  fastify.get('/shops/:slug/auth/customer/google', async (request, reply) => {
    const paramsSchema = z.object({ slug: z.string().min(1).max(100) });
    const { slug } = validateRequest(paramsSchema, request.params);
    const redirectUri = (request.query as { redirect_uri?: string })?.redirect_uri;

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return reply.status(503).send({ error: 'Google login is not configured' });
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      return reply.status(404).send({ error: 'Shop not found' });
    }

    const callbackPath = `/api/auth/customer/google/callback`;
    const baseUrl = env.PUBLIC_API_URL
      ? env.PUBLIC_API_URL.replace(/\/$/, '')
      : (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-host']
          ? `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}`
          : `${request.protocol}://${request.headers.host || request.hostname}`);
    const backendRedirectUri = `${baseUrl}${callbackPath}`;

    const { google } = await import('googleapis');
    const oauth2 = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      backendRedirectUri
    );

    const state = Buffer.from(JSON.stringify({ slug, redirect_uri: redirectUri || '' })).toString('base64url');
    const scope = 'openid email profile';
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      scope,
      state,
      prompt: 'consent',
    });
    return reply.redirect(302, url);
  });

  /**
   * Google OAuth callback: exchange code, find/create client, issue JWT, redirect to frontend.
   * Root callback - shop slug comes from OAuth state. Single redirect URI for all shops.
   *
   * @route GET /api/auth/customer/google/callback
   */
  fastify.get('/auth/customer/google/callback', async (request, reply) => {
    const query = request.query as { code?: string; state?: string };

    const frontendOrigin = env.CORS_ORIGIN.replace(/\/$/, '');

    const redirectToLogin = (error: string, useSlug?: string) => {
      const slug = useSlug ?? env.SHOP_SLUG;
      return reply.redirect(302, `${frontendOrigin}/projects/${slug}/shop/login?error=${encodeURIComponent(error)}`);
    };

    if (!query.code || !query.state) {
      return redirectToLogin('google_callback_missing');
    }

    let stateData: { slug: string; redirect_uri: string };
    try {
      stateData = JSON.parse(Buffer.from(query.state, 'base64url').toString());
    } catch {
      return redirectToLogin('invalid_state');
    }
    const slug = stateData.slug;
    if (!slug || typeof slug !== 'string') {
      return redirectToLogin('invalid_state');
    }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return redirectToLogin('google_not_configured', slug);
    }

    const shop = await getShopBySlug(slug);
    if (!shop) {
      return redirectToLogin('shop_not_found', slug);
    }

    const callbackPath = `/api/auth/customer/google/callback`;
    const baseUrl = env.PUBLIC_API_URL
      ? env.PUBLIC_API_URL.replace(/\/$/, '')
      : (request.headers['x-forwarded-proto'] && request.headers['x-forwarded-host']
          ? `${request.headers['x-forwarded-proto']}://${request.headers['x-forwarded-host']}`
          : `${request.protocol}://${request.headers.host || request.hostname}`);
    const redirectUri = `${baseUrl}${callbackPath}`;

    const { google } = await import('googleapis');
    const oauth2 = new google.auth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const { tokens } = await oauth2.getToken(query.code).catch(() => {
      throw new ValidationError('Google token exchange failed');
    });
    oauth2.setCredentials(tokens);
    const oauth2Client = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: userinfo } = await oauth2Client.userinfo.get().catch(() => {
      throw new ValidationError('Failed to get Google user info');
    });

    const googleId = userinfo.id;
    const email = userinfo.email?.trim().toLowerCase();
    const name = (userinfo.name || userinfo.given_name || email?.split('@')[0] || 'Customer').trim();

    if (!email) {
      return redirectToLogin('google_no_email', slug);
    }

    const normalizedEmail = normalizeEmail(email);
    const phonePlaceholder = `e:${normalizedEmail}`;

    let client = await db.query.clients.findFirst({
      where: and(
        eq(schema.clients.shopId, shop.id),
        eq(schema.clients.email, normalizedEmail)
      ),
    });

    if (client) {
      if (!client.googleId) {
        await db.update(schema.clients).set({
          googleId,
          updatedAt: new Date(),
        }).where(eq(schema.clients.id, client.id));
      }
    } else {
      const [created] = await db.insert(schema.clients).values({
        shopId: shop.id,
        phone: phonePlaceholder,
        name,
        email: normalizedEmail,
        googleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      client = created ?? client;
    }

    if (!client) {
      return redirectToLogin('create_failed', slug);
    }

    logAuthSuccess(request, shop.id, 'customer');
    const token = signToken({
      userId: client.id,
      shopId: shop.id,
      role: 'customer',
      clientId: client.id,
    });
    const redirectPath = stateData.redirect_uri && stateData.redirect_uri.startsWith('/')
      ? stateData.redirect_uri
      : '/checkin/confirm';
    const frontendCallbackPath = `/projects/${slug}/shop/callback`;
    const callbackUrl = `${frontendOrigin}${frontendCallbackPath}?token=${encodeURIComponent(token)}&shop=${encodeURIComponent(slug)}&client_id=${encodeURIComponent(String(client.id))}&name=${encodeURIComponent(client.name ?? 'Customer')}&redirect=${encodeURIComponent(redirectPath)}`;
    return reply.redirect(302, callbackUrl);
  });
};

