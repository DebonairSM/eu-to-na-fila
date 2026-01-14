import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

/**
 * Storage client for S3-compatible object storage.
 * Supports AWS S3, Cloudflare R2, MinIO, and other S3-compatible services.
 */
class StorageClient {
  private client: S3Client;
  private bucket: string;
  private publicBaseUrl: string;

  constructor() {
    const config: {
      region: string;
      credentials: {
        accessKeyId: string;
        secretAccessKey: string;
      };
      endpoint?: string;
      forcePathStyle?: boolean;
    } = {
      region: env.STORAGE_REGION,
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
      },
    };

    // For R2 and MinIO, we need to set the endpoint
    if (env.STORAGE_ENDPOINT) {
      config.endpoint = env.STORAGE_ENDPOINT;
      // MinIO and some S3-compatible services require path-style addressing
      if (env.STORAGE_PROVIDER === 'minio' || env.STORAGE_PROVIDER === 'r2') {
        config.forcePathStyle = true;
      }
    }

    this.client = new S3Client(config);
    this.bucket = env.STORAGE_BUCKET;
    this.publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL;
  }

  /**
   * Generate a presigned URL for uploading a file.
   * 
   * @param key - Storage key/path for the file
   * @param contentType - MIME type of the file
   * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
   * @returns Presigned PUT URL and required headers
   */
  async generatePresignedPutUrl(
    key: string,
    contentType: string,
    expiresIn: number = 900 // 15 minutes
  ): Promise<{ uploadUrl: string; requiredHeaders: Record<string, string> }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      requiredHeaders: {
        'Content-Type': contentType,
      },
    };
  }

  /**
   * Verify that a file exists in storage and get its metadata.
   * 
   * @param key - Storage key/path for the file
   * @returns File metadata including size, content type, and ETag
   * @throws Error if file doesn't exist
   */
  async verifyFileExists(key: string): Promise<{
    bytes: number;
    contentType: string;
    etag: string;
  }> {
    // #region agent log
    const { appendFileSync, mkdirSync, existsSync } = await import('fs');
    const logPath = '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log';
    const logDir = '/Users/ronbandeira/Documents/eu-to-na-fila/.cursor';
    try {
      if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
      appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'apps/api/src/lib/storage.ts:verifyFileExists',message:'Before HEAD request',data:{key,bucket:this.bucket},timestamp:Date.now()}) + '\n');
    } catch {}
    // #endregion
    
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    let response;
    try {
      response = await this.client.send(command);
      // #region agent log
      try {
        appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'apps/api/src/lib/storage.ts:verifyFileExists',message:'HEAD request success',data:{contentLength:response.ContentLength,contentType:response.ContentType,etag:response.ETag,hasAllFields:!!(response.ContentLength && response.ContentType && response.ETag)},timestamp:Date.now()}) + '\n');
      } catch {}
      // #endregion
    } catch (error) {
      // #region agent log
      try {
        appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H2',location:'apps/api/src/lib/storage.ts:verifyFileExists',message:'HEAD request error',data:{error:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : undefined,key,bucket:this.bucket},timestamp:Date.now()}) + '\n');
      } catch {}
      // #endregion
      throw error;
    }

    if (!response.ContentLength || !response.ContentType || !response.ETag) {
      // #region agent log
      try {
        appendFileSync(logPath, JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H3',location:'apps/api/src/lib/storage.ts:verifyFileExists',message:'Incomplete metadata',data:{contentLength:response.ContentLength,contentType:response.ContentType,etag:response.ETag},timestamp:Date.now()}) + '\n');
      } catch {}
      // #endregion
      throw new Error('File metadata incomplete');
    }

    return {
      bytes: response.ContentLength,
      contentType: response.ContentType,
      etag: response.ETag.replace(/"/g, ''), // Remove quotes from ETag
    };
  }

  /**
   * Get the first few bytes of a file to verify its type via magic bytes.
   * 
   * @param key - Storage key/path for the file
   * @param maxBytes - Maximum bytes to read (default: 12, enough for most file signatures)
   * @returns Buffer with the first bytes of the file
   */
  async getFileHeader(key: string, maxBytes: number = 12): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Range: `bytes=0-${maxBytes - 1}`,
    });

    const response = await this.client.send(command);
    
    if (!response.Body) {
      throw new Error('File body is empty');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Validate file type by checking magic bytes.
   * 
   * @param header - First bytes of the file
   * @param expectedMimeType - Expected MIME type
   * @returns True if file type matches expected type
   */
  validateFileType(header: Buffer, expectedMimeType: string): boolean {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (expectedMimeType === 'image/png') {
      return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
    }

    // JPEG: FF D8 FF
    if (expectedMimeType === 'image/jpeg' || expectedMimeType === 'image/jpg') {
      return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    }

    // WebP: RIFF...WEBP (check for RIFF at start and WEBP at offset 8)
    if (expectedMimeType === 'image/webp') {
      const riff = header.toString('ascii', 0, 4) === 'RIFF';
      const webp = header.length >= 12 && header.toString('ascii', 8, 12) === 'WEBP';
      return riff && webp;
    }

    // MP4: ftyp at offset 4
    if (expectedMimeType === 'video/mp4') {
      return header.length >= 8 && header.toString('ascii', 4, 8) === 'ftyp';
    }

    // If we don't have a validator for this type, return true (trust the MIME type)
    return true;
  }

  /**
   * Get the public URL for a file.
   * 
   * @param key - Storage key/path for the file
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    // Remove leading slash if present
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`;
  }

  /**
   * Generate a storage key for an ad file.
   * 
   * @param companyId - Company ID
   * @param shopId - Shop ID (optional)
   * @param adId - Ad ID
   * @param extension - File extension (e.g., '.png', '.mp4')
   * @returns Storage key
   */
  generateAdKey(companyId: number, shopId: number | null, adId: number, extension: string): string {
    const shopPart = shopId ? `shops/${shopId}` : 'company';
    return `ads/${companyId}/${shopPart}/${adId}${extension}`;
  }
}

/**
 * Singleton storage client instance.
 */
export const storage = new StorageClient();
