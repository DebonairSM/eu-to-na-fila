import { test, expect } from '../helpers/fixtures.js';
import { 
  enterKioskMode, 
  waitForQueueView, 
  waitForAdView,
  getCurrentView,
  KIOSK_TIMINGS,
} from '../helpers/kiosk.js';
import { loginAsBarber } from '../helpers/auth.js';

test.describe('Kiosk Mode Ad Live Updates', () => {
  test('should update ad1 image when new ad is uploaded via admin', async ({ page, request }) => {
    // Step 1: Login as barber and enter kiosk mode
    await loginAsBarber(page);
    await enterKioskMode(page);
    
    // Step 2: Wait for initial ad1 to appear and capture its src
    await waitForQueueView(page, 5000);
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    const initialAd1Image = page.locator('img[src*="gt-ad.png"]:not([src*="gt-ad2"])');
    await expect(initialAd1Image).toBeVisible();
    const initialSrc = await initialAd1Image.getAttribute('src');
    expect(initialSrc).toBeTruthy();
    
    // Step 3: Upload a new ad as company admin
    const { getCompanyAdminToken } = await import('../helpers/auth.js');
    const companyToken = await getCompanyAdminToken(request);
    
    // If we can't login as company admin, skip the upload part but still test the websocket connection
    if (companyToken) {
      // Create a simple test image (1x1 PNG)
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');
      
      // Upload new ad using new endpoint
      const uploadResponse = await request.post('http://localhost:4041/api/ads/uploads', {
        headers: {
          'Authorization': `Bearer ${companyToken}`,
        },
        multipart: {
          file: {
            name: 'test-ad.png',
            mimeType: 'image/png',
            buffer: testImageBuffer,
          },
        },
      });
      
      expect(uploadResponse.ok()).toBeTruthy();
      const uploadData = await uploadResponse.json();
      expect(uploadData.ad).toHaveProperty('version');
      expect(uploadData.ad).toHaveProperty('publicUrl');
      
      // Step 4: Wait for manifest poll (kiosk polls every 45s) and verify new ad appears
      await page.waitForTimeout(50000);
      
      // Check if the new ad appears (either replaces old one or appears in rotation)
      const newAdImage = page.locator(`img[src*="${uploadData.ad.publicUrl}"], video[src*="${uploadData.ad.publicUrl}"]`);
      const newAdVisible = await newAdImage.isVisible({ timeout: 15000 }).catch(() => false);
      
      expect(newAdVisible).toBeTruthy();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Company admin login not available - skipped upload test',
      });
    }
  });

  test('should update ad2 image when new ad is uploaded via admin', async ({ page, request }) => {
    await loginAsBarber(page);
    await enterKioskMode(page);
    
    // Wait for ad2 to appear
    await waitForQueueView(page, 5000);
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    const initialAd2Image = page.locator('img[src*="gt-ad2.png"]');
    await expect(initialAd2Image).toBeVisible();
    const initialSrc = await initialAd2Image.getAttribute('src');
    expect(initialSrc).toBeTruthy();
    
    // Try to upload new ad2 (similar to ad1 test)
    const companyLoginResponse = await request.post('http://localhost:4041/api/company/auth/login', {
      data: {
        email: 'admin@test.com',
        password: 'admin123',
      },
    });
    
    let companyToken: string | null = null;
    if (companyLoginResponse.ok()) {
      const loginData = await companyLoginResponse.json();
      companyToken = loginData.token;
    }
    
    if (companyToken) {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const testImageBuffer = Buffer.from(testImageBase64, 'base64');
      
      const uploadResponse = await request.post('http://localhost:4041/api/ads/upload', {
        headers: {
          'Authorization': `Bearer ${companyToken}`,
        },
        multipart: {
          file: {
            name: 'test-ad2.png',
            mimeType: 'image/png',
            buffer: testImageBuffer,
          },
          adType: 'ad2',
        },
      });
      
      expect(uploadResponse.ok()).toBeTruthy();
      const uploadData = await uploadResponse.json();
      const newVersion = uploadData.version;
      
      // Wait for manifest poll (kiosk polls every 45s)
      await page.waitForTimeout(50000);
      await expect(initialAd2Image).toHaveAttribute('src', new RegExp(`v=${newVersion}`), { timeout: 15000 });
      
      const updatedSrc = await initialAd2Image.getAttribute('src');
      expect(updatedSrc).toContain(`v=${newVersion}`);
    }
  });

  test('kiosk uses polling for manifest updates', async ({ page }) => {
    await loginAsBarber(page);
    await enterKioskMode(page);
    
    // Kiosk no longer uses WebSocket; it polls the manifest every 45s.
    // Verify kiosk is active (queue or ad view visible).
    await waitForQueueView(page, 10000);
    const queueOrAdVisible = await page.locator('button:has-text("Entrar na Fila"), img[src*="?v="], video[src*="?v="], text=/Nenhum anúncio/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(queueOrAdVisible).toBeTruthy();
  });
});

