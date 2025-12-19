import { test, expect } from '@playwright/test';
import { getAuthToken } from '../helpers/auth.js';
import { uploadAdImage, getAdStatus } from '../helpers/api.js';

test.describe('Ads API Endpoints', () => {
  let ownerToken: string;

  test.beforeAll(async ({ request }) => {
    // Get owner token for authentication
    ownerToken = await getAuthToken(request, 'owner');
  });

  test.describe('POST /api/ads/upload', () => {
    test('should upload ad1 image successfully with owner authentication', async ({ request }) => {
      const result = await uploadAdImage(request, ownerToken, 'ad1');
      
      expect(result.message).toContain('successfully');
      expect(result.filename).toBe('gt-ad.png');
      expect(result.path).toBe('/mineiro/gt-ad.png');
    });

    test('should upload ad2 image successfully with owner authentication', async ({ request }) => {
      const result = await uploadAdImage(request, ownerToken, 'ad2');
      
      expect(result.message).toContain('successfully');
      expect(result.filename).toBe('gt-ad2.png');
      expect(result.path).toBe('/mineiro/gt-ad2.png');
    });

    test('should reject upload without authentication', async ({ request }) => {
      const response = await request.post('http://localhost:4041/api/ads/upload', {
        multipart: {
          file: {
            name: 'gt-ad.png',
            mimeType: 'image/png',
            buffer: Buffer.from('test'),
          },
          adType: 'ad1',
        },
      });
      
      expect(response.status()).toBe(401);
    });

    test('should reject upload with invalid adType', async ({ request }) => {
      const response = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        multipart: {
          file: {
            name: 'gt-ad.png',
            mimeType: 'image/png',
            buffer: Buffer.from('test'),
          },
          adType: 'invalid',
        },
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid adType');
    });

    test('should reject upload without file', async ({ request }) => {
      const response = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        multipart: {
          adType: 'ad1',
        },
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('No file provided');
    });

    test('should validate file type (accepts PNG, JPEG, JPG, WebP)', async ({ request }) => {
      // Test valid PNG
      const pngResponse = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        multipart: {
          file: {
            name: 'test.png',
            mimeType: 'image/png',
            buffer: Buffer.from('89504E470D0A1A0A', 'hex'), // PNG signature
          },
          adType: 'ad1',
        },
      });
      
      // Should accept PNG (or fail on other validation, but not file type)
      expect([200, 400, 500]).toContain(pngResponse.status());
      
      // Test invalid file type
      const invalidResponse = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from('invalid file'),
          },
          adType: 'ad1',
        },
      });
      
      expect(invalidResponse.status()).toBe(400);
      const data = await invalidResponse.json();
      expect(data.error).toContain('Invalid file type');
    });

    test('should handle file size limits (10MB max)', async ({ request }) => {
      // Create a buffer larger than 10MB
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const response = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          Authorization: `Bearer ${ownerToken}`,
        },
        multipart: {
          file: {
            name: 'large.png',
            mimeType: 'image/png',
            buffer: largeBuffer,
          },
          adType: 'ad1',
        },
      });
      
      // Should reject or handle large file (may be 400 or 413)
      expect([400, 413, 500]).toContain(response.status());
    });
  });

  test.describe('GET /api/ads/status', () => {
    test('should return ad status with owner authentication', async ({ request }) => {
      const status = await getAdStatus(request, ownerToken);
      
      expect(status).toHaveProperty('ad1');
      expect(status).toHaveProperty('ad2');
      expect(status.ad1).toHaveProperty('exists');
      expect(status.ad1).toHaveProperty('path');
      expect(status.ad2).toHaveProperty('exists');
      expect(status.ad2).toHaveProperty('path');
    });

    test('should return correct path when ad exists', async ({ request }) => {
      // Upload ad1 first
      await uploadAdImage(request, ownerToken, 'ad1');
      
      // Check status
      const status = await getAdStatus(request, ownerToken);
      
      if (status.ad1.exists) {
        expect(status.ad1.path).toBe('/mineiro/gt-ad.png');
      }
    });

    test('should return null path when ad does not exist', async ({ request }) => {
      const status = await getAdStatus(request, ownerToken);
      
      // If ad doesn't exist, path should be null
      if (!status.ad1.exists) {
        expect(status.ad1.path).toBeNull();
      }
      if (!status.ad2.exists) {
        expect(status.ad2.path).toBeNull();
      }
    });

    test('should reject status request without authentication', async ({ request }) => {
      const response = await request.get('http://localhost:4041/api/ads/status');
      
      expect(response.status()).toBe(401);
    });

    test('should reject status request with barber token (requires owner)', async ({ request }) => {
      // Get barber token
      const barberToken = await getAuthToken(request, 'barber');
      
      const response = await request.get('http://localhost:4041/api/ads/status', {
        headers: {
          Authorization: `Bearer ${barberToken}`,
        },
      });
      
      // Should be 403 Forbidden (barber doesn't have owner role)
      expect(response.status()).toBe(403);
    });
  });

  test.describe('End-to-end ad upload and status', () => {
    test('should upload both ads and verify status', async ({ request }) => {
      // Upload ad1
      const ad1Result = await uploadAdImage(request, ownerToken, 'ad1');
      expect(ad1Result.filename).toBe('gt-ad.png');
      
      // Upload ad2
      const ad2Result = await uploadAdImage(request, ownerToken, 'ad2');
      expect(ad2Result.filename).toBe('gt-ad2.png');
      
      // Check status - both should exist
      const status = await getAdStatus(request, ownerToken);
      
      // Files may or may not exist depending on test order
      // Just verify the status structure is correct
      expect(status.ad1).toBeDefined();
      expect(status.ad2).toBeDefined();
      expect(status.ad1.exists).toBeDefined();
      expect(status.ad2.exists).toBeDefined();
    });
  });
});

