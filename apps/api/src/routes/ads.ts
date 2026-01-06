import type { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream } from 'fs';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ad management routes.
 * Handles ad image uploads for kiosk display.
 */
export const adsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Upload an ad image.
   * Requires company admin authentication.
   * 
   * @route POST /api/ads/upload
   * @body file - Image file (multipart/form-data)
   * @body adType - Type of ad: 'ad1' | 'ad2'
   * @returns Success message with file path
   * @throws {400} If validation fails
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.register(async function (instance) {
    // Register multipart plugin ONLY for this nested scope (upload route)
    // This isolates it from other routes to prevent interference with JSON parsing
    try {
      await instance.register(fastifyMultipart, {
        attachFieldsToBody: false, // Don't attach to body, use request.file() instead
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB max file size
        },
      });
    } catch (error) {
      throw error;
    }
    
    instance.post(
      '/ads/upload',
      {
        preHandler: [requireAuth(), requireCompanyAdmin()],
      },
      async (request, reply) => {
      try {
        if (!request.user || !request.user.companyId) {
          return reply.status(403).send({
            error: 'Company admin access required',
            statusCode: 403,
            code: 'FORBIDDEN',
          });
        }

        let data: any = null;
        let adType: string | null = null;

        // Iterate through all parts to get both file and fields
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file') {
            data = part;
          } else if (part.fieldname === 'adType') {
            adType = part.value as string;
          }
        }
        
      if (!data) {
        return reply.status(400).send({
          error: 'No file provided',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      if (!adType || !['ad1', 'ad2'].includes(adType)) {
        return reply.status(400).send({
          error: 'Invalid adType. Must be "ad1" or "ad2"',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      // Validate file type
      const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      // Determine filename based on ad type
      const filename = adType === 'ad1' ? 'gt-ad.png' : 'gt-ad2.png';

      // Save to company-specific directory in API's public folder
      const companyId = request.user.companyId;
      const companyAdsDir = join(__dirname, '..', '..', 'public', 'companies', String(companyId));
      const filePath = join(companyAdsDir, filename);

      // Ensure directory exists
      if (!existsSync(companyAdsDir)) {
        await mkdir(companyAdsDir, { recursive: true });
      }

      // Write file
      const buffer = await data.toBuffer();
      await writeFile(filePath, buffer);

      const response = {
        message: 'Ad image uploaded successfully',
        filename,
        path: `/api/ads/${companyId}/${filename}`,
      };

      return reply.status(200).send(response);
      } catch (error) {
        request.log.error({ err: error }, 'Error uploading ad image');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500,
          code: 'INTERNAL_ERROR',
        });
      }
    });
  });

  /**
   * Get current ad images status.
   * Requires company admin authentication.
   * 
   * @route GET /api/ads/status
   * @returns Status of ad images
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.get(
    '/ads/status',
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
      const companyAdsDir = join(__dirname, '..', '..', 'public', 'companies', String(companyId));
      
      const ad1Path = join(companyAdsDir, 'gt-ad.png');
      const ad2Path = join(companyAdsDir, 'gt-ad2.png');
      
      const ad1Exists = existsSync(ad1Path);
      const ad2Exists = existsSync(ad2Path);

      return {
        ad1: {
          exists: ad1Exists,
          path: ad1Exists ? `/api/ads/${companyId}/gt-ad.png` : null,
        },
        ad2: {
          exists: ad2Exists,
          path: ad2Exists ? `/api/ads/${companyId}/gt-ad2.png` : null,
        },
      };
    }
  );

  /**
   * Serve ad image files.
   * Public endpoint for kiosk display (no authentication required).
   * 
   * @route GET /api/ads/:companyId/:filename
   * @param companyId - Company ID
   * @param filename - Image filename (gt-ad.png or gt-ad2.png)
   * @returns Image file stream
   * @throws {404} If file not found
   */
  fastify.get(
    '/ads/:companyId/:filename',
    async (request, reply) => {
      const params = request.params as { companyId: string; filename: string };
      const { companyId, filename } = params;

      // Validate filename to prevent directory traversal
      if (!['gt-ad.png', 'gt-ad2.png'].includes(filename)) {
        return reply.status(400).send({
          error: 'Invalid filename',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      const companyAdsDir = join(__dirname, '..', '..', 'public', 'companies', companyId);
      const filePath = join(companyAdsDir, filename);

      // Check if file exists
      if (!existsSync(filePath)) {
        return reply.status(404).send({
          error: 'Ad image not found',
          statusCode: 404,
          code: 'NOT_FOUND',
        });
      }

      // Determine MIME type from file extension
      const ext = extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Stream the file
      const stream = createReadStream(filePath);
      return reply.type(contentType).send(stream);
    }
  );
};

