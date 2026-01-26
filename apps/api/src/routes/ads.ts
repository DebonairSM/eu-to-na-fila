import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { join } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync, createReadStream, statSync } from 'fs';
import { env } from '../env.js';
import { getPublicPath } from '../lib/paths.js';
import { uploadAdFile, getAdFileUrl, deleteAdFile } from '../lib/storage.js';

/**
 * Ad management routes.
 * Handles direct file uploads and manifest serving for kiosk display.
 */
export const adsRoutes: FastifyPluginAsync = async (fastify) => {
  // Allowed MIME types for ads
  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4'];
  const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

  // Get public directory path using shared utility to ensure consistency
  const publicPath = getPublicPath();

  /**
   * Request presigned URL for uploading an ad.
   * Requires company admin authentication.
   * 
   * @route POST /api/ads/uploads
   * @body shopId - Optional shop ID (for shop-specific ads)
   * @body mediaType - 'image' or 'video'
   * @body mimeType - MIME type (e.g., 'image/png', 'video/mp4')
   * @body bytes - File size in bytes
   * @body position - Position in the ad list (default: append to end)
   * @returns Presigned upload URL and ad ID
   * @throws {400} If validation fails
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.post(
    '/ads/uploads',
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

      const companyId = request.user.companyId;
      
      // Use request.parts() to get both file and form fields
      // IMPORTANT: Must consume ALL parts completely or the stream will hang
      let fileBuffer: Buffer | null = null;
      let fileMimetype: string | null = null;
      let fileBytesRead: number = 0;
      let shopId: number | null = null;
      let position: number | undefined = undefined;
        
      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file' && part.fieldname === 'file') {
            // Consume the file stream immediately to prevent hanging
            fileBuffer = await part.toBuffer();
            fileMimetype = part.mimetype;
            fileBytesRead = part.file.bytesRead;
          } else if (part.type === 'field') {
            if (part.fieldname === 'shopId' && part.value) {
              const parsed = parseInt(String(part.value), 10);
              shopId = isNaN(parsed) ? null : parsed;
            } else if (part.fieldname === 'position' && part.value) {
              const parsed = parseInt(String(part.value), 10);
              position = isNaN(parsed) ? undefined : parsed;
            }
          }
        }
      } catch (error) {
        request.log.error({ err: error }, 'Error parsing multipart data');
        throw new ValidationError('Failed to parse upload data', [
          { field: 'file', message: 'Invalid multipart form data' },
        ]);
      }

      if (!fileBuffer || !fileMimetype) {
        throw new ValidationError('No file provided', [
          { field: 'file', message: 'File is required' },
        ]);
      }

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(fileMimetype)) {
        throw new ValidationError(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`, [
          { field: 'file', message: 'Invalid MIME type' },
        ]);
      }

      // Validate file size
      if (fileBytesRead > MAX_FILE_SIZE) {
        throw new ValidationError(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`, [
          { field: 'file', message: 'File size exceeds limit' },
        ]);
      }

      // Determine media type and extension
      const isImage = ALLOWED_IMAGE_TYPES.includes(fileMimetype);
      const mediaType = isImage ? 'image' : 'video';
      const mimeToExt: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
      };
      const extension = mimeToExt[fileMimetype] || '.bin';

      // Validate shop belongs to company if shopId provided
      if (shopId) {
        const shop = await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.id, shopId),
            eq(schema.shops.companyId, companyId)
          ),
        });

        if (!shop) {
          throw new ValidationError('Shop not found or does not belong to your company', [
            { field: 'shopId', message: 'Invalid shop ID' },
          ]);
        }
      }

      // Get next position if not provided
      let finalPosition = position;
      if (finalPosition === undefined) {
        const existingAds = await db.query.companyAds.findMany({
          where: and(
            eq(schema.companyAds.companyId, companyId),
            shopId ? eq(schema.companyAds.shopId, shopId) : isNull(schema.companyAds.shopId)
          ),
          orderBy: (ads, { desc }) => [desc(ads.position)],
          limit: 1,
        });
        finalPosition = existingAds.length > 0 ? existingAds[0].position + 1 : 0;
      }

      // Create ad record first to get the ID
      const [ad] = await db.insert(schema.companyAds).values({
        companyId,
        shopId: shopId || null,
        position: finalPosition,
        enabled: false,
        mediaType,
        mimeType: fileMimetype,
        bytes: fileBytesRead,
        storageKey: '', // Will be set after upload
        publicUrl: '', // Will be set after upload
        version: 1,
      }).returning();

      // Upload to Supabase Storage if configured, otherwise fall back to local filesystem
      let publicUrl: string;
      let storageKey: string;
      
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        // Upload to Supabase Storage
        publicUrl = await uploadAdFile(companyId, ad.id, fileBuffer, fileMimetype);
        storageKey = `companies/${companyId}/ads/${ad.id}${extension}`;
      } else {
        // Fallback to local filesystem
        const companyAdsDir = join(publicPath, 'companies', companyId.toString(), 'ads');
        if (!existsSync(companyAdsDir)) {
          await mkdir(companyAdsDir, { recursive: true });
        }

        const filename = `${ad.id}${extension}`;
        const filePath = join(companyAdsDir, filename);
        await writeFile(filePath, fileBuffer);
        
        publicUrl = `/companies/${companyId}/ads/${filename}`;
        storageKey = `companies/${companyId}/ads/${filename}`;
      }

      // Update ad record with public URL, storage key, and enable it
      const [updatedAd] = await db.update(schema.companyAds)
        .set({
          publicUrl,
          storageKey,
          enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.companyAds.id, ad.id))
        .returning();

      // Calculate manifest version for broadcast
      const allAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, companyId),
          eq(schema.companyAds.enabled, true),
          or(
            eq(schema.companyAds.shopId, shopId || -1),
            isNull(schema.companyAds.shopId)
          )
        ),
      });
      const manifestVersion = allAds.reduce((sum, a) => sum + a.version, 0);

      // Broadcast WebSocket update
        const wsManager = (fastify as any).wsManager;
        if (wsManager) {
          try {
          wsManager.broadcastAdsUpdated(companyId, shopId, manifestVersion);
          } catch (wsError) {
          request.log.warn({ err: wsError }, 'Error broadcasting ads update');
        }
      }

      return {
        message: 'Ad uploaded successfully',
        ad: {
          id: updatedAd.id,
          position: updatedAd.position,
          enabled: updatedAd.enabled,
          mediaType: updatedAd.mediaType,
          mimeType: updatedAd.mimeType,
          publicUrl: updatedAd.publicUrl,
          version: updatedAd.version,
        },
      };
    }
  );


  /**
   * Get ad media file (image or video).
   * No authentication required - public endpoint for kiosk display.
   * 
   * @route GET /api/ads/:id/media
   * @param id - Ad ID
   * @query v - Optional version number for cache busting
   * @returns Ad file (image or video)
   * @throws {404} If ad not found or file doesn't exist
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { v?: string | string[] };
  }>('/ads/:id/media', async (request, reply) => {
    const paramsSchema = z.object({
      id: z.string().transform((val) => parseInt(val, 10)),
    });

    const { id } = validateRequest(paramsSchema, request.params);
    const { v } = validateRequest(
      z.object({
        v: z.union([z.string(), z.array(z.string())]).optional(),
      }),
      request.query
    );

    // Get ad from database
    const ad = await db.query.companyAds.findFirst({
      where: eq(schema.companyAds.id, id),
    });

    if (!ad) {
      throw new NotFoundError(`Ad with ID ${id} not found`);
    }

    if (!ad.publicUrl) {
      throw new NotFoundError(`Ad ${id} has no associated file`);
    }

    // If publicUrl is a full URL (Supabase Storage), redirect to it
    if (ad.publicUrl.startsWith('http://') || ad.publicUrl.startsWith('https://')) {
      // Set cache headers
      reply.header('Cache-Control', 'public, max-age=604800'); // 1 week
      if (v !== undefined || ad.version) {
        reply.header('ETag', `"${ad.id}-${ad.version}"`);
      }
      // Redirect to Supabase Storage URL (CDN-backed, handles range requests automatically)
      return reply.redirect(302, ad.publicUrl);
    }

    // Fallback to local filesystem for legacy ads
    // Build file path from publicUrl (format: /companies/{companyId}/ads/{filename})
    const urlParts = ad.publicUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    const companyId = ad.companyId.toString();
    const filePath = join(publicPath, 'companies', companyId, 'ads', filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      // If Supabase is configured and we have storage_key or can construct it, try Supabase URL
      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && ad.mimeType) {
        try {
          const supabaseUrl = getAdFileUrl(ad.companyId, id, ad.mimeType);
          fastify.log.info({ adId: id, supabaseUrl }, 'Legacy ad not found locally, redirecting to Supabase');
          reply.header('Cache-Control', 'public, max-age=604800');
          if (v !== undefined || ad.version) {
            reply.header('ETag', `"${ad.id}-${ad.version}"`);
          }
          return reply.redirect(302, supabaseUrl);
        } catch (error) {
          fastify.log.warn({ adId: id, err: error }, 'Failed to construct Supabase URL for legacy ad');
        }
      }
      fastify.log.warn({ adId: id, filePath }, 'Ad file not found on disk');
      throw new NotFoundError(`Ad file not found for ad ${id}`);
    }

    // Set content type based on MIME type stored in database
    if (ad.mimeType) {
      reply.type(ad.mimeType);
    } else {
      // Fallback to extension-based detection
      const ext = filePath.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        mp4: 'video/mp4',
      };
      reply.type(mimeTypes[ext || ''] || 'application/octet-stream');
    }

    // Set cache headers with version for cache busting
    reply.header('Cache-Control', 'public, max-age=604800'); // 1 week
    if (v !== undefined || ad.version) {
      // Version is already in query param or we can add it
      reply.header('ETag', `"${ad.id}-${ad.version}"`);
    }

    // Support range requests for video streaming (essential for <video> tags)
    const fileStat = statSync(filePath);
    const fileSize = fileStat.size;
    const range = request.headers.range;

    if (range) {
      // Parse range header (format: "bytes=start-end")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      // Set range response headers
      reply.code(206); // Partial Content
      reply.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      reply.header('Accept-Ranges', 'bytes');
      reply.header('Content-Length', chunksize.toString());

      // Stream the requested range
      const stream = createReadStream(filePath, { start, end });
      return reply.send(stream);
    } else {
      // No range requested - send full file
      reply.header('Content-Length', fileSize.toString());
      reply.header('Accept-Ranges', 'bytes');
      const stream = createReadStream(filePath);
      return reply.send(stream);
    }
  });

  /**
   * Get public manifest of enabled ads for a shop.
   * No authentication required.
   * 
   * @route GET /api/ads/public/manifest
   * @query shopSlug - Shop slug identifier
   * @returns Manifest with ordered list of enabled ads
   * @throws {404} If shop not found
   */
  fastify.get('/ads/public/manifest', async (request, reply) => {
    // Add CORS headers explicitly for guest network access
    const origin = request.headers.origin;
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      reply.header('Access-Control-Allow-Credentials', 'false');
    } else {
      reply.header('Access-Control-Allow-Origin', '*');
    }
    const querySchema = z.object({
      shopSlug: z.string().min(1),
    });

    const { shopSlug } = validateRequest(querySchema, request.query);

    // Get shop
    const shop = await db.query.shops.findFirst({
      where: eq(schema.shops.slug, shopSlug),
    });

    if (!shop) {
      throw new NotFoundError(`Shop with slug "${shopSlug}" not found`);
    }

    // Check if shop is linked to a company
    if (!shop.companyId) {
      throw new ValidationError('Shop is not linked to a company', [
        { field: 'shopSlug', message: `Shop "${shopSlug}" must be linked to a company to display ads` },
      ]);
    }

    // Get enabled ads for this shop (shop-specific) or company-wide (if no shop-specific ads)
    const shopAds = await db.query.companyAds.findMany({
      where: and(
        eq(schema.companyAds.companyId, shop.companyId),
        eq(schema.companyAds.shopId, shop.id),
        eq(schema.companyAds.enabled, true)
      ),
      orderBy: (ads, { asc }) => [asc(ads.position)],
    });

    // If no shop-specific ads, fall back to company-wide ads
    let ads = shopAds;
    if (ads.length === 0) {
      ads = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, shop.companyId),
          isNull(schema.companyAds.shopId),
          eq(schema.companyAds.enabled, true)
        ),
        orderBy: (ads, { asc }) => [asc(ads.position)],
      });
    }

    // Calculate manifest version (sum of all ad versions for cache busting)
    const manifestVersion = ads.reduce((sum, ad) => sum + ad.version, 0);

    // Build URLs - use API endpoint instead of static file paths
    // This simplifies the architecture and eliminates CORS/network issues
    const buildAdUrl = (adId: number, version: number): string => {
      // Use API endpoint: /api/ads/:id/media?v=:version
      return `/api/ads/${adId}/media?v=${version}`;
    };

    const manifest = {
      manifestVersion,
      ads: ads.map((ad) => ({
        id: ad.id,
        position: ad.position,
        mediaType: ad.mediaType,
        url: buildAdUrl(ad.id, ad.version),
        version: ad.version,
      })),
    };
    
    return manifest;
  });

  /**
   * Get all ads for a company (admin view).
   * Requires company admin authentication.
   * 
   * @route GET /api/ads
   * @query shopId - Optional shop ID to filter by
   * @returns List of all ads (enabled and disabled)
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.get(
    '/ads',
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

      const querySchema = z.object({
        shopId: z.string().transform((val) => parseInt(val, 10)).optional(),
      });

      const query = validateRequest(querySchema, request.query);
      const companyId = request.user.companyId;

      const whereConditions = [
        eq(schema.companyAds.companyId, companyId),
      ];

      if (query.shopId) {
        whereConditions.push(eq(schema.companyAds.shopId, query.shopId));
      }

      const ads = await db.query.companyAds.findMany({
        where: and(...whereConditions),
        orderBy: (ads, { asc }) => [asc(ads.position), asc(ads.id)],
      });

      return ads;
    }
  );

  /**
   * Update an ad (enable/disable, reorder, delete).
   * Requires company admin authentication.
   * 
   * @route PATCH /api/ads/:id
   * @param id - Ad ID
   * @body enabled - Enable/disable the ad
   * @body position - New position in the list
   * @returns Updated ad
   * @throws {400} If validation fails
   * @throws {401} If not authenticated
   * @throws {403} If not company admin or ad doesn't belong to company
   * @throws {404} If ad not found
   */
  fastify.patch(
    '/ads/:id',
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
        enabled: z.boolean().optional(),
        position: z.number().int().nonnegative().optional(),
      });

      const { id } = validateRequest(paramsSchema, request.params);
      const body = validateRequest(bodySchema, request.body);
      const companyId = request.user.companyId;

      // Get ad and verify ownership
      const ad = await db.query.companyAds.findFirst({
        where: and(
          eq(schema.companyAds.id, id),
          eq(schema.companyAds.companyId, companyId)
        ),
      });

      if (!ad) {
        throw new NotFoundError('Ad not found or access denied');
      }

      // Build update object
      const updates: Partial<typeof schema.companyAds.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (body.enabled !== undefined) {
        updates.enabled = body.enabled;
        // Increment version when enabling/disabling for cache busting
        if (body.enabled !== ad.enabled) {
          updates.version = ad.version + 1;
        }
      }

      if (body.position !== undefined && body.position !== ad.position) {
        updates.position = body.position;
      }

      const [updatedAd] = await db.update(schema.companyAds)
        .set(updates)
        .where(eq(schema.companyAds.id, id))
        .returning();

      // Calculate manifest version for broadcast
      const allAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, companyId),
          eq(schema.companyAds.enabled, true),
          or(
            eq(schema.companyAds.shopId, ad.shopId || -1),
            isNull(schema.companyAds.shopId)
          )
        ),
      });
      const manifestVersion = allAds.reduce((sum, a) => sum + a.version, 0);

      // Broadcast WebSocket update
      const wsManager = (fastify as any).wsManager;
      if (wsManager) {
        try {
          wsManager.broadcastAdsUpdated(companyId, ad.shopId, manifestVersion);
        } catch (wsError) {
          request.log.warn({ err: wsError }, 'Error broadcasting ads update');
        }
      }

      return updatedAd;
    }
  );

  /**
   * Delete an ad.
   * Requires company admin authentication.
   * 
   * @route DELETE /api/ads/:id
   * @param id - Ad ID
   * @returns Success message
   * @throws {401} If not authenticated
   * @throws {403} If not company admin or ad doesn't belong to company
   * @throws {404} If ad not found
   */
  fastify.delete(
    '/ads/:id',
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
      const companyId = request.user.companyId;

      // Get ad and verify ownership
      const ad = await db.query.companyAds.findFirst({
        where: and(
          eq(schema.companyAds.id, id),
          eq(schema.companyAds.companyId, companyId)
        ),
      });

      if (!ad) {
        throw new NotFoundError('Ad not found or access denied');
      }

      // Delete file from storage if it exists
      if (ad.publicUrl) {
        try {
          // If it's a Supabase URL, delete from Supabase Storage
          if (ad.publicUrl.startsWith('http://') || ad.publicUrl.startsWith('https://')) {
            if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && ad.mimeType) {
              await deleteAdFile(ad.companyId, id, ad.mimeType);
              request.log.info({ adId: id }, 'Deleted ad file from Supabase Storage');
            }
          } else {
            // Fallback to local filesystem deletion
            const urlParts = ad.publicUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const companyId = ad.companyId.toString();
            const filePath = join(publicPath, 'companies', companyId, 'ads', filename);
            
            if (existsSync(filePath)) {
              await unlink(filePath);
              request.log.info({ adId: id, filePath }, 'Deleted ad file from filesystem');
            }
          }
        } catch (fileError) {
          // Log error but don't fail the deletion - file might not exist
          request.log.warn({ err: fileError, adId: id }, 'Error deleting ad file from storage');
        }
      }

      // Delete ad from database
      await db.delete(schema.companyAds)
        .where(eq(schema.companyAds.id, id));

      // Calculate manifest version for broadcast (before deletion)
      const allAds = await db.query.companyAds.findMany({
        where: and(
          eq(schema.companyAds.companyId, companyId),
          eq(schema.companyAds.enabled, true),
          or(
            eq(schema.companyAds.shopId, ad.shopId || -1),
            isNull(schema.companyAds.shopId)
          )
        ),
      });
      const manifestVersion = allAds.reduce((sum, a) => sum + a.version, 0);

      // Broadcast WebSocket update
      const wsManager = (fastify as any).wsManager;
      if (wsManager) {
        try {
          wsManager.broadcastAdsUpdated(companyId, ad.shopId, manifestVersion);
        } catch (wsError) {
          request.log.warn({ err: wsError }, 'Error broadcasting ads update');
        }
      }

      return {
        message: 'Ad deleted successfully',
      };
    }
  );
};
