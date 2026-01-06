import type { FastifyPluginAsync } from 'fastify';
import fastifyMultipart from '@fastify/multipart';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
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
        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:48',message:'Upload endpoint called',data:{hasUser:!!request.user,companyId:request.user?.companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        if (!request.user || !request.user.companyId) {
          return reply.status(403).send({
            error: 'Company admin access required',
            statusCode: 403,
            code: 'FORBIDDEN',
          });
        }

        let data: any = null;
        let adType: string | null = null;

        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:62',message:'Starting to parse multipart parts',data:{companyId:request.user.companyId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // Iterate through all parts to get both file and fields
        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === 'file') {
            data = part;
            // #region agent log
            await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:65',message:'File part found',data:{mimetype:data.mimetype,filename:data.filename},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
          } else if (part.fieldname === 'adType') {
            adType = part.value as string;
            // #region agent log
            await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:67',message:'adType field found',data:{adType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
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

      // Save to company-specific directory
      const companyId = request.user.companyId;
      const companyAdsDir = join(__dirname, '..', '..', '..', 'web', 'public', 'companies', String(companyId));
      const webPublicPath = join(companyAdsDir, filename);

      // #region agent log
      await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:100',message:'Preparing to save file',data:{companyId,filename,companyAdsDir,webPublicPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Ensure directory exists
      if (!existsSync(companyAdsDir)) {
        await mkdir(companyAdsDir, { recursive: true });
        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:107',message:'Directory created',data:{companyAdsDir},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
      }

        // Write file
        const buffer = await data.toBuffer();

        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:112',message:'Buffer created, writing file',data:{bufferSize:buffer.length,webPublicPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        await writeFile(webPublicPath, buffer);

        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:115',message:'File written successfully',data:{webPublicPath,path:`/companies/${companyId}/${filename}`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        const response = {
          message: 'Ad image uploaded successfully',
          filename,
          path: `/companies/${companyId}/${filename}`,
        };

        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:123',message:'Sending success response',data:{response},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        return reply.status(200).send(response);
      } catch (error) {
        // #region agent log
        await fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ads.ts:120',message:'Upload error caught',data:{error:error instanceof Error ? error.message : String(error),stack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

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
      const companyAdsDir = join(__dirname, '..', '..', '..', 'web', 'public', 'companies', String(companyId));
      
      const ad1Path = join(companyAdsDir, 'gt-ad.png');
      const ad2Path = join(companyAdsDir, 'gt-ad2.png');
      
      const ad1Exists = existsSync(ad1Path);
      const ad2Exists = existsSync(ad2Path);

      return {
        ad1: {
          exists: ad1Exists,
          path: ad1Exists ? `/companies/${companyId}/gt-ad.png` : null,
        },
        ad2: {
          exists: ad2Exists,
          path: ad2Exists ? `/companies/${companyId}/gt-ad2.png` : null,
        },
      };
    }
  );
};

