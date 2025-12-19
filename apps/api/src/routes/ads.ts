import type { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { requireAuth, requireRole } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ad management routes.
 * Handles ad image uploads for kiosk display.
 */
export const adsRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart plugin for file uploads (only for this plugin scope)
  // This should not interfere with JSON parsing on other routes
  await fastify.register(fastifyMultipart, {
    attachFieldsToBody: false, // Don't attach to body, use request.file() instead
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });

  /**
   * Upload an ad image.
   * Requires owner authentication.
   * 
   * @route POST /api/ads/upload
   * @body file - Image file (multipart/form-data)
   * @body adType - Type of ad: 'ad1' | 'ad2'
   * @returns Success message with file path
   * @throws {400} If validation fails
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   */
  fastify.post(
    '/ads/upload',
    {
      preHandler: [requireAuth(), requireRole('owner')],
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'No file provided',
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        });
      }

      const adType = data.fields.adType?.value as string;
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

      // Save to web public directory (for Vite dev server)
      const webPublicPath = join(__dirname, '..', '..', '..', 'web', 'public', filename);
      const webPublicDir = dirname(webPublicPath);

      // Ensure directory exists
      if (!existsSync(webPublicDir)) {
        await mkdir(webPublicDir, { recursive: true });
      }

      // Write file
      const buffer = await data.toBuffer();
      await writeFile(webPublicPath, buffer);

      return reply.status(200).send({
        message: 'Ad image uploaded successfully',
        filename,
        path: `/mineiro/${filename}`,
      });
    }
  );

  /**
   * Get current ad images status.
   * Requires owner authentication.
   * 
   * @route GET /api/ads/status
   * @returns Status of ad images
   * @throws {401} If not authenticated
   * @throws {403} If not owner
   */
  fastify.get(
    '/ads/status',
    {
      preHandler: [requireAuth(), requireRole('owner')],
    },
    async (request, reply) => {
      const webPublicPath = join(__dirname, '..', '..', '..', 'web', 'public');
      
      const ad1Exists = existsSync(join(webPublicPath, 'gt-ad.png'));
      const ad2Exists = existsSync(join(webPublicPath, 'gt-ad2.png'));

      return {
        ad1: {
          exists: ad1Exists,
          path: ad1Exists ? '/mineiro/gt-ad.png' : null,
        },
        ad2: {
          exists: ad2Exists,
          path: ad2Exists ? '/mineiro/gt-ad2.png' : null,
        },
      };
    }
  );
};

