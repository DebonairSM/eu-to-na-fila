import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq, and, or, isNull, asc } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { env } from '../env.js';

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

  // Get public directory path
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicPath = join(__dirname, '..', 'public');

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
        storageKey: '', // Not used for local storage
        publicUrl: '', // Will be set after file save
        version: 1,
      }).returning();

      // Create directory structure: public/companies/<company-id>/ads/
      const companyAdsDir = join(publicPath, 'companies', companyId.toString(), 'ads');
        if (!existsSync(companyAdsDir)) {
          await mkdir(companyAdsDir, { recursive: true });
        }

      // Save file (buffer was already consumed above)
      const filename = `${ad.id}${extension}`;
      const filePath = join(companyAdsDir, filename);
      await writeFile(filePath, fileBuffer);

      // Set public URL (relative path for static serving)
      const publicUrl = `/companies/${companyId}/ads/${filename}`;

      // Update ad record with public URL and enable it
      const [updatedAd] = await db.update(schema.companyAds)
        .set({
          publicUrl,
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

    // Build URLs - use absolute URL if STORAGE_PUBLIC_BASE_URL is set, otherwise use relative
    const baseUrl = env.STORAGE_PUBLIC_BASE_URL;
    const buildAdUrl = (publicUrl: string, version: number): string => {
      const urlWithVersion = `${publicUrl}?v=${version}`;
      if (baseUrl) {
        try {
          return new URL(urlWithVersion, baseUrl).toString();
        } catch {
          // If baseUrl is invalid, fall back to relative URL
          return urlWithVersion;
        }
      }
      return urlWithVersion;
    };

    return {
      manifestVersion,
      ads: ads.map((ad) => ({
        id: ad.id,
        position: ad.position,
        mediaType: ad.mediaType,
        url: buildAdUrl(ad.publicUrl, ad.version),
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

      // Delete file from filesystem if it exists
      if (ad.publicUrl) {
        try {
          // Extract filename from publicUrl (format: /companies/<company-id>/ads/<filename>)
          const urlParts = ad.publicUrl.split('/');
          const filename = urlParts[urlParts.length - 1];
          const companyId = ad.companyId.toString();
          const filePath = join(publicPath, 'companies', companyId, 'ads', filename);
          
          if (existsSync(filePath)) {
            await unlink(filePath);
            request.log.info({ adId: id, filePath }, 'Deleted ad file from filesystem');
          }
        } catch (fileError) {
          // Log error but don't fail the deletion - file might not exist
          request.log.warn({ err: fileError, adId: id }, 'Error deleting ad file from filesystem');
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
