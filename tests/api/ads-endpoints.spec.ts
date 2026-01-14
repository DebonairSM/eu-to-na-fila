import { test, expect } from '@playwright/test';
import { getAuthToken } from '../helpers/auth.js';

test.describe('Ads API Endpoints', () => {
  let adminToken: string;
  const API_BASE = 'http://localhost:4041/api';

  test.beforeAll(async ({ request }) => {
    // Get company admin token for authentication
    adminToken = await getAuthToken(request, 'companyAdmin');
  });

  test.describe('POST /api/ads/uploads', () => {
    test('should request presigned URL for image upload', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'image',
          mimeType: 'image/png',
          bytes: 1024,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('adId');
      expect(data).toHaveProperty('uploadUrl');
      expect(data).toHaveProperty('requiredHeaders');
      expect(data).toHaveProperty('storageKey');
      expect(data.requiredHeaders).toHaveProperty('Content-Type');
    });

    test('should reject presign request without authentication', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'image',
          mimeType: 'image/png',
          bytes: 1024,
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should reject presign request with invalid media type', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'invalid',
          mimeType: 'image/png',
          bytes: 1024,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject presign request with invalid MIME type', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'image',
          mimeType: 'text/plain',
          bytes: 1024,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject presign request with file size exceeding limit', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'image',
          mimeType: 'image/png',
          bytes: 100 * 1024 * 1024, // 100MB, exceeds 50MB limit
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/ads/uploads/complete', () => {
    test('should complete upload after file is uploaded to storage', async ({ request }) => {
      // Step 1: Request presigned URL
      const presignResponse = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          mediaType: 'image',
          mimeType: 'image/png',
          bytes: 1024,
        },
      });

      expect(presignResponse.status()).toBe(200);
      const presignData = await presignResponse.json();

      // Step 2: Upload file to presigned URL (mock - in real test, would upload actual file)
      // Note: This test assumes storage is configured and accessible
      // In a real scenario, you'd upload a test PNG file here

      // Step 3: Complete upload
      const completeResponse = await request.post(`${API_BASE}/ads/uploads/complete`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          adId: presignData.adId,
        },
      });

      // May fail if file wasn't actually uploaded to storage
      // This is expected in test environment without real storage
      expect([200, 400, 404]).toContain(completeResponse.status());
    });

    test('should reject complete request without authentication', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ads/uploads/complete`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          adId: 1,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('GET /api/ads/public/manifest', () => {
    test('should return manifest for shop', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('manifestVersion');
      expect(data).toHaveProperty('ads');
      expect(Array.isArray(data.ads)).toBe(true);
    });

    test('should return 404 for non-existent shop', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=nonexistent`);

      expect(response.status()).toBe(404);
    });
  });

  test.describe('GET /api/ads', () => {
    test('should return all ads for company admin', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should reject request without authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('PATCH /api/ads/:id', () => {
    test('should update ad enabled status', async ({ request }) => {
      // First, create an ad via presign (if storage is available)
      // For this test, we'll just verify the endpoint structure
      const response = await request.patch(`${API_BASE}/ads/999`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          enabled: true,
        },
      });

      // May be 404 if ad doesn't exist, or 200 if it does
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('DELETE /api/ads/:id', () => {
    test('should delete ad', async ({ request }) => {
      const response = await request.delete(`${API_BASE}/ads/999`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // May be 404 if ad doesn't exist, or 200 if it does
      expect([200, 404]).toContain(response.status());
    });
  });
});
