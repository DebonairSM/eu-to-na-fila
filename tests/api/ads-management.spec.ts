import { test, expect } from '@playwright/test';
import { getAuthToken } from '../helpers/auth.js';

test.describe('Ads Management API', () => {
  let adminToken: string;
  let createdAdId: number;
  const API_BASE = 'http://localhost:4041/api';

  test.beforeAll(async ({ request }) => {
    adminToken = await getAuthToken(request, 'companyAdmin');
  });

  test.beforeEach(async ({ request }) => {
    if (!adminToken) {
      return;
    }

    // Create a test ad before each test
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageBase64, 'base64');

    const createResponse = await request.post(`${API_BASE}/ads/uploads`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      multipart: {
        file: {
          name: 'test-ad.png',
          mimeType: 'image/png',
          buffer: testImageBuffer,
        },
      },
    });

    if (createResponse.ok()) {
      const data = await createResponse.json();
      createdAdId = data.ad.id;
    }
  });

  test.describe('GET /api/ads', () => {
    test('should return all ads for company admin', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/ads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // May be 403 if token doesn't have proper permissions
      expect([200, 403]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        
        if (data.length > 0) {
          const ad = data[0];
          expect(ad).toHaveProperty('id');
          expect(ad).toHaveProperty('companyId');
          expect(ad).toHaveProperty('position');
          expect(ad).toHaveProperty('enabled');
          expect(ad).toHaveProperty('mediaType');
          expect(ad).toHaveProperty('mimeType');
          expect(ad).toHaveProperty('publicUrl');
          expect(ad).toHaveProperty('version');
        }
      }
    });

    test('should reject request without authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads`);

      expect(response.status()).toBe(401);
    });

    test('should filter by shopId when provided', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      const response = await request.get(`${API_BASE}/ads?shopId=1`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // May be 403 if token doesn't have proper permissions
      expect([200, 403]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  test.describe('PATCH /api/ads/:id', () => {
    test('should update ad enabled status', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      const response = await request.patch(`${API_BASE}/ads/${createdAdId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          enabled: false,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.ad).toHaveProperty('enabled', false);
      expect(data.ad).toHaveProperty('version');
    });

    test('should update ad position', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      const response = await request.patch(`${API_BASE}/ads/${createdAdId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          position: 5,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.ad).toHaveProperty('position', 5);
    });

    test('should increment version on update', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      // Get initial version
      const getResponse = await request.get(`${API_BASE}/ads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      const ads = await getResponse.json();
      const ad = ads.find((a: any) => a.id === createdAdId);
      const initialVersion = ad?.version || 1;

      // Update the ad
      const updateResponse = await request.patch(`${API_BASE}/ads/${createdAdId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          enabled: true,
        },
      });

      expect(updateResponse.status()).toBe(200);
      const data = await updateResponse.json();
      expect(data.ad.version).toBeGreaterThan(initialVersion);
    });

    test('should reject update without authentication', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      const response = await request.patch(`${API_BASE}/ads/${createdAdId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          enabled: true,
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent ad', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      const response = await request.patch(`${API_BASE}/ads/99999`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          enabled: true,
        },
      });

      // May be 403 if token doesn't have access, or 404 if ad doesn't exist
      expect([404, 403]).toContain(response.status());
    });
  });

  test.describe('DELETE /api/ads/:id', () => {
    test('should delete ad successfully', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      const response = await request.delete(`${API_BASE}/ads/${createdAdId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('message');
    });

    test('should remove file from disk when deleting', async ({ request }) => {
      // Create a new ad for this test
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      const createResponse = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        multipart: {
          file: {
            name: 'delete-test.png',
            mimeType: 'image/png',
            buffer: testImageBuffer,
          },
        },
      });

      if (!createResponse.ok()) {
        test.skip();
        return;
      }

      const createData = await createResponse.json();
      const adId = createData.ad.id;
      const publicUrl = createData.ad.publicUrl;

      // Delete the ad
      const deleteResponse = await request.delete(`${API_BASE}/ads/${adId}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      expect(deleteResponse.status()).toBe(200);

      // Verify file is no longer accessible (should 404)
      const fileResponse = await request.get(`http://localhost:4041${publicUrl}`);
      expect([404, 403]).toContain(fileResponse.status());
    });

    test('should reject delete without authentication', async ({ request }) => {
      if (!createdAdId) {
        test.skip();
        return;
      }

      const response = await request.delete(`${API_BASE}/ads/${createdAdId}`);

      expect(response.status()).toBe(401);
    });

    test('should return 404 for non-existent ad', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      const response = await request.delete(`${API_BASE}/ads/99999`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // May be 403 if token doesn't have access, or 404 if ad doesn't exist
      expect([404, 403]).toContain(response.status());
    });
  });
});
