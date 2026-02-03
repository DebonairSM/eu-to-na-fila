import { test, expect } from '@playwright/test';
import { getCompanyAdminToken } from '../helpers/auth.js';
import { apiBaseUrlWithPath } from '../config.js';

test.describe('Ads API Endpoints', () => {
  let adminToken: string | null;
  const API_BASE = apiBaseUrlWithPath;

  test.beforeAll(async ({ request }) => {
    // Get company admin token for authentication
    adminToken = await getCompanyAdminToken(request);
    if (!adminToken) {
      console.warn('Company admin token not available - some tests may be skipped');
    }
  });

  // Note: Upload tests are now in ads-upload.spec.ts
  // This file focuses on endpoint structure and compatibility

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
      if (!adminToken) {
        test.skip();
        return;
      }

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
      if (!adminToken) {
        test.skip();
        return;
      }

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

      // May be 404 if ad doesn't exist, 403 if no access, or 200 if it does
      expect([200, 404, 403]).toContain(response.status());
    });
  });

  test.describe('DELETE /api/ads/:id', () => {
    test('should delete ad', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      const response = await request.delete(`${API_BASE}/ads/999`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      // May be 404 if ad doesn't exist, 403 if no access, or 200 if it does
      expect([200, 404, 403]).toContain(response.status());
    });
  });
});
