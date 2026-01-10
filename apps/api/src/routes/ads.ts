import type { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, createReadStream } from 'fs';
import { requireAuth, requireCompanyAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ad version storage interface.
 * Tracks version numbers for each ad type per company.
 */
interface AdVersions {
  ad1: number;
  ad2: number;
}

/**
 * Get current ad versions for a company.
 * Creates version file if it doesn't exist.
 */
async function getAdVersions(companyAdsDir: string): Promise<AdVersions> {
  const versionsPath = join(companyAdsDir, '.versions.json');
  
  if (existsSync(versionsPath)) {
    try {
      const content = await readFile(versionsPath, 'utf-8');
      return JSON.parse(content) as AdVersions;
    } catch {
      // If file is corrupted, start fresh
    }
  }
  
  // Default versions
  return { ad1: 0, ad2: 0 };
}

/**
 * Update version for a specific ad type.
 * Returns an incrementing version number starting from 1.
 */
async function updateAdVersion(companyAdsDir: string, adType: 'ad1' | 'ad2'): Promise<number> {
  const versions = await getAdVersions(companyAdsDir);
  // Increment version number (start from 1 if it doesn't exist or is 0)
  const currentVersion = versions[adType] || 0;
  const newVersion = currentVersion + 1;
  versions[adType] = newVersion;
  
  const versionsPath = join(companyAdsDir, '.versions.json');
  await writeFile(versionsPath, JSON.stringify(versions, null, 2), 'utf-8');
  
  return newVersion;
}

/**
 * Ad management routes.
 * Handles ad image uploads for kiosk display.
 */
export const adsRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart plugin scoped to this plugin only
  await fastify.register(fastifyMultipart, {
    attachFieldsToBody: false,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
  });

  /**
   * Upload an ad image.
   * Requires company admin authentication.
   * Uses stream-safe multipart handling to prevent hangs.
   * 
   * @route POST /api/ads/upload
   * @body file - Image file (multipart/form-data)
   * @body adType - Type of ad: 'ad1' | 'ad2'
   * @returns Success message with file path and version
   * @throws {400} If validation fails
   * @throws {401} If not authenticated
   * @throws {403} If not company admin
   */
  fastify.post(
    '/ads/upload',
    {
      preHandler: [requireAuth(), requireCompanyAdmin()],
    },
    async (request, reply) => {
      let filePart: any = null;
      
      try {
        // Log request details for debugging
        request.log.info({
          method: request.method,
          url: request.url,
          headers: {
            'content-type': request.headers['content-type'],
            'content-length': request.headers['content-length'],
          },
          hasUser: !!request.user,
          companyId: request.user?.companyId,
        }, 'Ad upload request received');

        if (!request.user || !request.user.companyId) {
          return reply.status(403).send({
            error: 'Company admin access required',
            statusCode: 403,
            code: 'FORBIDDEN',
          });
        }

        // Stream-safe multipart handling: iterate parts() once and collect both file and fields
        // This ensures the stream is consumed properly without hanging
        let adType: string | null = null;
        
        try {
          const parts = request.parts();
          for await (const part of parts) {
            if (part.type === 'file') {
              filePart = part;
            } else if (part.type === 'field' && part.fieldname === 'adType') {
              adType = part.value as string;
            }
          }
        } catch (parseError) {
          request.log.error({ err: parseError }, 'Error parsing multipart data');
          // Clean up file stream if it exists
          if (filePart?.file) {
            try {
              filePart.file.destroy();
            } catch (destroyError) {
              request.log.warn({ err: destroyError }, 'Error destroying file stream');
            }
          }
          return reply.status(400).send({
            error: 'Error parsing multipart form data',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          });
        }
        
        if (!filePart) {
          return reply.status(400).send({
            error: 'No file provided',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          });
        }
        
        if (!adType || !['ad1', 'ad2'].includes(adType)) {
          // Clean up file stream before returning error
          if (filePart?.file) {
            try {
              filePart.file.destroy();
            } catch (destroyError) {
              request.log.warn({ err: destroyError }, 'Error destroying file stream');
            }
          }
          return reply.status(400).send({
            error: 'Invalid adType. Must be "ad1" or "ad2"',
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          });
        }

        // TypeScript type narrowing: adType is now guaranteed to be 'ad1' | 'ad2'
        const validatedAdType = adType as 'ad1' | 'ad2';

        // Validate file type
        const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowedMimeTypes.includes(filePart.mimetype)) {
          // Clean up file stream before returning error
          if (filePart?.file) {
            try {
              filePart.file.destroy();
            } catch (destroyError) {
              request.log.warn({ err: destroyError }, 'Error destroying file stream');
            }
          }
          return reply.status(400).send({
            error: `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
            statusCode: 400,
            code: 'VALIDATION_ERROR',
          });
        }

        // Determine filename based on ad type
        const filename = validatedAdType === 'ad1' ? 'gt-ad.png' : 'gt-ad2.png';

        // Save to company-specific directory in API's public folder
        const companyId = request.user.companyId;
        const companyAdsDir = join(__dirname, '..', '..', 'public', 'companies', String(companyId));
        const filePath = join(companyAdsDir, filename);

        // Ensure directory exists
        if (!existsSync(companyAdsDir)) {
          await mkdir(companyAdsDir, { recursive: true });
        }

        // Consume file stream to buffer and write
        // This properly consumes the stream, preventing hangs
        let buffer: Buffer;
        try {
          request.log.debug('Converting file stream to buffer');
          buffer = await filePart.toBuffer();
          request.log.debug({ bufferSize: buffer.length }, 'File stream converted to buffer');
        } catch (bufferError) {
          request.log.error({ err: bufferError }, 'Error converting file stream to buffer');
          // Clean up file stream on error
          if (filePart?.file) {
            try {
              filePart.file.destroy();
            } catch (destroyError) {
              request.log.warn({ err: destroyError }, 'Error destroying file stream');
            }
          }
          return reply.status(500).send({
            error: 'Error processing file stream',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
          });
        }

        // Write file to disk
        try {
          await writeFile(filePath, buffer);
          request.log.debug({ filePath }, 'File written to disk');
        } catch (writeError) {
          request.log.error({ err: writeError, filePath }, 'Error writing file to disk');
          return reply.status(500).send({
            error: 'Error saving file',
            statusCode: 500,
            code: 'INTERNAL_ERROR',
          });
        }
        
        // Update version and get new version number
        const version = await updateAdVersion(companyAdsDir, validatedAdType);

        const response = {
          message: 'Ad image uploaded successfully',
          filename,
          path: `/api/ads/${companyId}/${filename}`,
          version,
        };

        // Broadcast websocket event if websocket is available
        const wsManager = (fastify as any).wsManager;
        if (wsManager) {
          try {
            wsManager.broadcastAdUpdate(companyId, adType, version);
          } catch (wsError) {
            // Don't fail the request if websocket broadcast fails
            request.log.warn({ err: wsError }, 'Error broadcasting websocket update');
          }
        }

        request.log.info({ companyId, adType, filename, version }, 'Ad image uploaded successfully');
        return reply.status(200).send(response);
      } catch (error) {
        request.log.error({ err: error }, 'Error uploading ad image');
        
        // Ensure file stream is cleaned up on any error
        if (filePart?.file) {
          try {
            filePart.file.destroy();
          } catch (destroyError) {
            request.log.warn({ err: destroyError }, 'Error destroying file stream in error handler');
          }
        }
        
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500,
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

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
   * Supports version query parameter for cache-busting.
   * 
   * @route GET /api/ads/:companyId/:filename
   * @param companyId - Company ID
   * @param filename - Image filename (gt-ad.png or gt-ad2.png)
   * @query v - Optional version number for cache-busting
   * @returns Image file stream with appropriate cache headers
   * @throws {404} If file not found
   */
  fastify.get(
    '/ads/:companyId/:filename',
    async (request, reply) => {
      const params = request.params as { companyId: string; filename: string };
      const query = request.query as { v?: string };
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

      // Set cache headers based on version parameter
      if (query.v) {
        // Versioned requests can be cached aggressively (immutable)
        reply.header('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Unversioned requests should not be cached to avoid stale content
        reply.header('Cache-Control', 'no-cache, must-revalidate');
      }

      // Stream the file
      const stream = createReadStream(filePath);
      return reply.type(contentType).send(stream);
    }
  );
};

