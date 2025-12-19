import { APIRequestContext, expect } from '@playwright/test';
import { readFile } from 'fs/promises';

const API_BASE_URL = 'http://localhost:4041/api';

/**
 * Creates a minimal test PNG image buffer
 * This is a 1x1 pixel PNG
 */
function createTestImageBuffer(): Buffer {
  // Minimal PNG: 1x1 pixel
  return Buffer.from(
    '89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082',
    'hex'
  );
}

/**
 * Uploads an ad image via the API using Playwright's multipart form handling
 * @param request - Playwright API request context
 * @param token - Authentication token
 * @param adType - Type of ad ('ad1' or 'ad2')
 * @param imagePath - Optional path to image file
 * @param imageBuffer - Optional image buffer (uses test image if neither provided)
 */
export async function uploadAdImage(
  request: APIRequestContext,
  token: string,
  adType: 'ad1' | 'ad2',
  imagePath?: string,
  imageBuffer?: Buffer
): Promise<{ message: string; filename: string; path: string }> {
  let buffer: Buffer;
  
  if (imageBuffer) {
    buffer = imageBuffer;
  } else if (imagePath) {
    buffer = await readFile(imagePath);
  } else {
    buffer = createTestImageBuffer();
  }
  
  // Use Playwright's multipart API - the API expects 'file' field with the image
  // and 'adType' field with the type
  const response = await request.post(`${API_BASE_URL}/ads/upload`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    multipart: {
      file: {
        name: adType === 'ad1' ? 'gt-ad.png' : 'gt-ad2.png',
        mimeType: 'image/png',
        buffer: buffer,
      },
      adType: adType,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.message).toContain('successfully');
  expect(data.filename).toBeDefined();
  expect(data.path).toBeDefined();
  
  return data;
}

/**
 * Gets the status of ad images
 */
export async function getAdStatus(
  request: APIRequestContext,
  token: string
): Promise<{ ad1: { exists: boolean; path: string | null }; ad2: { exists: boolean; path: string | null } }> {
  const response = await request.get(`${API_BASE_URL}/ads/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.ad1).toBeDefined();
  expect(data.ad2).toBeDefined();
  
  return data;
}

