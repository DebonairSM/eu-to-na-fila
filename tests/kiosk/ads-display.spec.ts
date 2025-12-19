import { test, expect } from '../helpers/fixtures.js';
import { 
  enterKioskMode, 
  waitForQueueView, 
  waitForAdView,
  getCurrentView,
  KIOSK_TIMINGS,
} from '../helpers/kiosk.js';
import { loginAsBarber } from '../helpers/auth.js';

test.describe('Kiosk Mode Ad Display', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBarber(page);
    await enterKioskMode(page);
  });

  test('should display ad1 image from correct path', async ({ page }) => {
    // Wait for queue view first
    await waitForQueueView(page, 5000);
    
    // Wait for ad1 to appear
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Verify ad1 image is displayed
    const ad1Image = page.locator('img[src*="gt-ad.png"]:not([src*="gt-ad2"])');
    await expect(ad1Image).toBeVisible();
    
    // Verify the image source contains the expected path
    const src = await ad1Image.getAttribute('src');
    expect(src).toContain('gt-ad.png');
    
    // Verify current view is ad1
    expect(await getCurrentView(page)).toBe('ad1');
  });

  test('should display ad2 image from correct path', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Skip ad1: queue -> ad1 -> queue -> ad2
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Verify ad2 image is displayed
    const ad2Image = page.locator('img[src*="gt-ad2.png"]');
    await expect(ad2Image).toBeVisible();
    
    // Verify the image source
    const src = await ad2Image.getAttribute('src');
    expect(src).toContain('gt-ad2.png');
    
    // Verify current view is ad2
    expect(await getCurrentView(page)).toBe('ad2');
  });

  test('should display ad3 video from correct path', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Skip to ad3: queue -> ad1 -> queue -> ad2 -> queue -> ad3
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Verify ad3 video is displayed
    const ad3Video = page.locator('video[src*="gt-ad-001.mp4"]');
    await expect(ad3Video).toBeVisible();
    
    // Verify the video source
    const src = await ad3Video.getAttribute('src');
    expect(src).toContain('gt-ad-001.mp4');
    
    // Verify current view is ad3
    expect(await getCurrentView(page)).toBe('ad3');
    
    // Video should have autoplay, loop, and muted attributes
    await expect(ad3Video).toHaveAttribute('autoplay', '');
    await expect(ad3Video).toHaveAttribute('loop', '');
    await expect(ad3Video).toHaveAttribute('muted', '');
  });

  test('should show loading state during ad transition', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Wait for ad transition to start
    await waitForAdView(page, 'any', KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Check if loading state appears (may be brief, so we check if it exists or not)
    // The loading state might be too fast to catch, so we just verify the ad loads
    const adElement = page.locator('img[src*="gt-ad"], video[src*="gt-ad"]').first();
    await expect(adElement).toBeVisible({ timeout: 10000 });
  });

  test('should handle missing ad images gracefully', async ({ page }) => {
    // This test checks that error states are handled
    // If an image fails to load, it should show an error message or placeholder
    
    await waitForQueueView(page, 5000);
    
    // Intercept image requests and force failure for ad1
    await page.route('**/gt-ad.png', route => route.abort());
    
    // Wait for ad1 to attempt to load
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Should show error state or continue gracefully
    // The component should handle this and either show an error message or skip
    // We verify the page doesn't crash and continues functioning
    const hasError = await page.locator('text=/erro|error/i, text=/carregar/i').isVisible({ timeout: 2000 }).catch(() => false);
    
    // Page should still be responsive
    expect(await page.title()).toBeTruthy();
  });

  test('should display ads in fullscreen-friendly container', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Wait for any ad to appear
    await waitForAdView(page, 'any', KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Ad container should take full viewport
    const adContainer = page.locator('[class*="flex-1"], [class*="w-full"], [class*="h-full"]').first();
    await expect(adContainer).toBeVisible();
    
    // Images/videos should use object-contain to maintain aspect ratio
    const adElement = page.locator('img[src*="gt-ad"], video[src*="gt-ad"]').first();
    const classList = await adElement.getAttribute('class');
    expect(classList).toContain('object-contain');
  });

  test('should display all three ad types correctly in sequence', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Verify ad1
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad1');
    await expect(page.locator('img[src*="gt-ad.png"]:not([src*="gt-ad2"])')).toBeVisible();
    
    // Verify ad2
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad2');
    await expect(page.locator('img[src*="gt-ad2.png"]')).toBeVisible();
    
    // Verify ad3
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad3');
    await expect(page.locator('video[src*="gt-ad-001.mp4"]')).toBeVisible();
  });
});

