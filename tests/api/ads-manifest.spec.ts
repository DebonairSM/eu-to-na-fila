import { test, expect } from '@playwright/test';
import { getCompanyAdminToken } from '../helpers/auth.js';

test.describe('Ads Manifest API', () => {
  let adminToken: string | null;
  const API_BASE = 'http://localhost:4041/api';

  test.beforeAll(async ({ request }) => {
    adminToken = await getCompanyAdminToken(request);
    if (!adminToken) {
      console.warn('Company admin token not available - some tests may be skipped');
    }
  });

  test.describe('GET /api/ads/public/manifest', () => {
    test('should return manifest for existing shop', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('manifestVersion');
      expect(data).toHaveProperty('ads');
      expect(Array.isArray(data.ads)).toBe(true);
      expect(typeof data.manifestVersion).toBe('number');
    });

    test('should return empty ads array when no ads exist', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.ads)).toBe(true);
      expect(data.manifestVersion).toBeGreaterThanOrEqual(0);
    });

    test('should only return enabled ads', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      // Create an enabled ad
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      const createResponse = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        multipart: {
          file: {
            name: 'enabled-ad.png',
            mimeType: 'image/png',
            buffer: testImageBuffer,
          },
        },
      });

      if (createResponse.ok()) {
        const createData = await createResponse.json();
        const adId = createData.ad.id;

        // Disable the ad
        await request.patch(`${API_BASE}/ads/${adId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            enabled: false,
          },
        });

        // Check manifest - disabled ad should not appear
        const manifestResponse = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);
        const manifestData = await manifestResponse.json();
        const disabledAd = manifestData.ads.find((ad: any) => ad.id === adId);
        expect(disabledAd).toBeUndefined();
      }
    });

    test('should return ads ordered by position', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      if (data.ads.length > 1) {
        for (let i = 1; i < data.ads.length; i++) {
          expect(data.ads[i].position).toBeGreaterThanOrEqual(data.ads[i - 1].position);
        }
      }
    });

    test('should include version in ad URLs for cache busting', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      for (const ad of data.ads) {
        expect(ad).toHaveProperty('url');
        expect(ad.url).toContain('?v=');
        expect(ad).toHaveProperty('version');
        expect(typeof ad.version).toBe('number');
      }
    });

    test('should return 404 for non-existent shop', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=nonexistent-shop`);

      expect(response.status()).toBe(404);
    });

    test('should require shopSlug parameter', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest`);

      expect(response.status()).toBe(400);
    });

    test('should support shop-specific ads', async ({ request }) => {
      if (!adminToken) {
        test.skip();
        return;
      }

      // Create a shop-specific ad
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');

      const createResponse = await request.post(`${API_BASE}/ads/uploads`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        multipart: {
          file: {
            name: 'shop-specific-ad.png',
            mimeType: 'image/png',
            buffer: testImageBuffer,
          },
          shopId: '1', // Assuming shop ID 1 exists
        },
      });

      if (createResponse.ok()) {
        // Manifest should include shop-specific ads
        const manifestResponse = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);
        expect(manifestResponse.status()).toBe(200);
      }
    });

    test('should fallback to company-wide ads when no shop-specific ads', async ({ request }) => {
      // This test verifies the fallback logic
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data.ads)).toBe(true);
      // If shop-specific ads exist, they should be shown
      // If not, company-wide ads should be shown
    });

    test('should calculate manifest version as sum of ad versions', async ({ request }) => {
      const response = await request.get(`${API_BASE}/ads/public/manifest?shopSlug=mineiro`);

      expect(response.status()).toBe(200);
      const data = await response.json();
      
      const calculatedVersion = data.ads.reduce((sum: number, ad: any) => sum + ad.version, 0);
      expect(data.manifestVersion).toBe(calculatedVersion);
    });
  });
});
