import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { storage } from '../lib/storage.js';
import { env } from '../env.js';

/**
 * Ad management routes.
 * Handles ad uploads via presigned URLs and manifest serving for kiosk display.
 */
export const adsRoutes: FastifyPluginAsync = async (fastify) => {
  // Allowed MIME types for ads
  const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4'];
  const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

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

      const bodySchema = z.object({
        shopId: z.number().int().positive().nullable().optional(),
        mediaType: z.enum(['image', 'video']),
        mimeType: z.string().refine(
          (val) => ALLOWED_MIME_TYPES.includes(val),
          { message: `Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` }
        ),
        bytes: z.number().int().positive().max(MAX_FILE_SIZE),
        position: z.number().int().nonnegative().optional(),
      });

      const body = validateRequest(bodySchema, request.body);
      const companyId = request.user.companyId;

      // Validate shop belongs to company if shopId provided
      if (body.shopId) {
        const shop = await db.query.shops.findFirst({
          where: and(
            eq(schema.shops.id, body.shopId),
            eq(schema.shops.companyId, companyId)
          ),
        });

        if (!shop) {
          throw new ValidationError('Shop not found or does not belong to your company', [
            { field: 'shopId', message: 'Invalid shop ID' },
          ]);
        }
      }

      // Determine file extension from MIME type
      const mimeToExt: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/webp': '.webp',
        'video/mp4': '.mp4',
      };
      const extension = mimeToExt[body.mimeType] || '.bin';

      // Get next position if not provided
      let position = body.position;
      if (position === undefined) {
        const existingAds = await db.query.companyAds.findMany({
          where: and(
            eq(schema.companyAds.companyId, companyId),
            body.shopId ? eq(schema.companyAds.shopId, body.shopId) : isNull(schema.companyAds.shopId)
          ),
          orderBy: (ads, { desc }) => [desc(ads.position)],
          limit: 1,
        });
        position = existingAds.length > 0 ? existingAds[0].position + 1 : 0;
      }

      // Create ad record (disabled by default until upload is verified)
      const [ad] = await db.insert(schema.companyAds).values({
        companyId,
        shopId: body.shopId || null,
        position,
        enabled: false,
        mediaType: body.mediaType,
        mimeType: body.mimeType,
        bytes: body.bytes,
        storageKey: '', // Will be set after upload
        publicUrl: '', // Will be set after upload
        version: 1,
      }).returning();

      // Generate storage key
      const storageKey = storage.generateAdKey(companyId, body.shopId ?? null, ad.id, extension);

      // Generate presigned URL
      const { uploadUrl, requiredHeaders } = await storage.generatePresignedPutUrl(
        storageKey,
        body.mimeType,
        900 // 15 minutes
      );
      
      // #region agent log
      const { appendFileSync, mkdirSync, existsSync } = await import('fs');
      const logPath = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log';
      const logDir = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor';
      try {
        if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
        appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H4',location:'apps/api/src/routes/ads.ts:presign',message:'Presigned URL generated',data:{adId:ad.id,storageKey,uploadUrl:uploadUrl.substring(0,100)+'...',mimeType:body.mimeType},timestamp:Date.now()}) + '\n');
      } catch {}
      // #endregion
      request.log.info({ adId: ad.id, storageKey, uploadUrl: uploadUrl.substring(0, 100) }, 'Presigned URL generated');

      // Update ad with storage key and public URL
      await db.update(schema.companyAds)
        .set({
          storageKey,
          publicUrl: storage.getPublicUrl(storageKey),
        })
        .where(eq(schema.companyAds.id, ad.id));

      return {
        adId: ad.id,
        uploadUrl,
        requiredHeaders,
        storageKey,
      };
    }
  );

  /**
   * Complete an ad upload by verifying the file in storage.
   * Requires company admin authentication.
   * 
   * @route POST /api/ads/uploads/complete
   * @body adId - Ad ID from presign response
   * @returns Success message with ad details
   * @throws {400} If validation fails or file verification fails
   * @throws {401} If not authenticated
   * @throws {403} If not company admin or ad doesn't belong to company
   * @throws {404} If ad not found
   */
  fastify.post(
    '/ads/uploads/complete',
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

      const bodySchema = z.object({
        adId: z.number().int().positive(),
      });

      const { adId } = validateRequest(bodySchema, request.body);
      const companyId = request.user.companyId;

      // Get ad and verify ownership
      const ad = await db.query.companyAds.findFirst({
        where: and(
          eq(schema.companyAds.id, adId),
          eq(schema.companyAds.companyId, companyId)
        ),
      });

      if (!ad) {
        throw new NotFoundError('Ad not found or access denied');
      }

      if (!ad.storageKey) {
        throw new ValidationError('Ad storage key not set', [
          { field: 'adId', message: 'Upload not initialized properly' },
        ]);
      }

      // Verify file exists in storage
      let fileMetadata;
      try {
        // #region agent log
        const { appendFileSync, mkdirSync, existsSync } = await import('fs');
        const logPath = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log';
        const logDir = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor';
        try {
          if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
          appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'apps/api/src/routes/ads.ts:complete',message:'Before verifyFileExists',data:{adId,storageKey:ad.storageKey,bucket:env.STORAGE_BUCKET,endpoint:env.STORAGE_ENDPOINT,provider:env.STORAGE_PROVIDER},timestamp:Date.now()}) + '\n');
        } catch {}
        // #endregion
        request.log.info({ adId, storageKey: ad.storageKey, bucket: env.STORAGE_BUCKET }, 'Verifying file exists in storage');
        
        fileMetadata = await storage.verifyFileExists(ad.storageKey);
        
        // #region agent log
        try {
          appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'apps/api/src/routes/ads.ts:complete',message:'After verifyFileExists success',data:{bytes:fileMetadata.bytes,contentType:fileMetadata.contentType,etag:fileMetadata.etag},timestamp:Date.now()}) + '\n');
        } catch {}
        // #endregion
        request.log.info({ adId, fileMetadata }, 'File verified successfully');
      } catch (error) {
        // #region agent log
        const { appendFileSync, mkdirSync, existsSync } = await import('fs');
        const logPath = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log';
        const logDir = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor';
        try {
          if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
          const errorDetails = error instanceof Error ? {
            message: error.message,
            name: error.name,
            code: (error as any).code,
            statusCode: (error as any).$metadata?.httpStatusCode,
            requestId: (error as any).$metadata?.requestId,
          } : { error: String(error) };
          appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'apps/api/src/routes/ads.ts:complete',message:'verifyFileExists error',data:{...errorDetails,storageKey:ad.storageKey,bucket:env.STORAGE_BUCKET},timestamp:Date.now()}) + '\n');
        } catch {}
        // #endregion
        request.log.error({ err: error, adId, storageKey: ad.storageKey, bucket: env.STORAGE_BUCKET }, 'File verification failed');
        
        // Provide more detailed error message
        const errorMessage = error instanceof Error 
          ? `File verification failed: ${error.message}${(error as any).code ? ` (${(error as any).code})` : ''}`
          : 'File verification failed';
        
        throw new ValidationError(errorMessage, [
          { field: 'adId', message: 'File verification failed. Check if file was uploaded to storage.' },
        ]);
      }

      // Verify file size matches
      if (fileMetadata.bytes !== ad.bytes) {
        throw new ValidationError('File size mismatch', [
          { field: 'bytes', message: `Expected ${ad.bytes} bytes, got ${fileMetadata.bytes}` },
        ]);
      }

      // Verify content type matches
      if (fileMetadata.contentType !== ad.mimeType) {
        throw new ValidationError('Content type mismatch', [
          { field: 'mimeType', message: `Expected ${ad.mimeType}, got ${fileMetadata.contentType}` },
        ]);
      }

      // Verify file type via magic bytes
      try {
        const fileHeader = await storage.getFileHeader(ad.storageKey);
        const isValidType = storage.validateFileType(fileHeader, ad.mimeType);
        
        if (!isValidType) {
          throw new ValidationError('File type verification failed. File content does not match declared MIME type.', [
            { field: 'mimeType', message: 'File magic bytes do not match declared type' },
          ]);
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        // If magic byte check fails for other reasons, log but don't fail (some storage providers may not support Range requests)
        request.log.warn({ err: error, adId }, 'Magic byte verification failed, but continuing');
      }

      // Update ad: enable it, store ETag, increment version
      const [updatedAd] = await db.update(schema.companyAds)
        .set({
          enabled: true,
          etag: fileMetadata.etag,
          version: ad.version + 1,
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
        message: 'Ad upload completed and verified',
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
   * Get public manifest of enabled ads for a shop.
   * No authentication required.
   * 
   * @route GET /api/ads/public/manifest
   * @query shopSlug - Shop slug identifier
   * @returns Manifest with ordered list of enabled ads
   * @throws {404} If shop not found
   */
  fastify.get('/ads/public/manifest', async (request, reply) => {
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

    // Get enabled ads for this shop (shop-specific) or company-wide (if no shop-specific ads)
    const shopAds = await db.query.companyAds.findMany({
      where: and(
        eq(schema.companyAds.companyId, shop.companyId!),
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
          eq(schema.companyAds.companyId, shop.companyId!),
          isNull(schema.companyAds.shopId),
          eq(schema.companyAds.enabled, true)
        ),
        orderBy: (ads, { asc }) => [asc(ads.position)],
      });
    }

    // Calculate manifest version (sum of all ad versions for cache busting)
    const manifestVersion = ads.reduce((sum, ad) => sum + ad.version, 0);

    return {
      manifestVersion,
      ads: ads.map((ad) => ({
        id: ad.id,
        position: ad.position,
        mediaType: ad.mediaType,
        url: `${ad.publicUrl}?v=${ad.version}`,
        version: ad.version,
      })),
    };
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

      // Delete ad
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
