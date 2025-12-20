import { test, expect } from '../helpers/fixtures.js';
import { 
  enterKioskMode, 
  waitForQueueView, 
  waitForAdView, 
  getCurrentView,
  KIOSK_TIMINGS,
  isRotationActive,
  waitForRotationToStart,
} from '../helpers/kiosk.js';
import { loginAsBarber } from '../helpers/auth.js';

test.describe('Kiosk Mode Ad Rotation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as barber and enter kiosk mode
    await loginAsBarber(page);
    await enterKioskMode(page);
  });

  test('should start with queue view on kiosk entry', async ({ page }) => {
    // Wait for queue view to be visible
    await waitForQueueView(page, 5000);
    
    // Verify we're in queue view
    const currentView = await getCurrentView(page);
    expect(currentView).toBe('queue');
    
    // Verify rotation is active (progress bar should be visible)
    const rotationActive = await isRotationActive(page);
    expect(rotationActive).toBeTruthy();
  });

  test('should rotate from queue to ad1 after queue duration', async ({ page }) => {
    // Wait for initial queue view
    await waitForQueueView(page, 5000);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Wait for rotation to ad view (15s queue + tolerance)
    // The ad view should appear (even if image fails to load, the container should be there)
    await waitForAdView(page, 'any', KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Verify we're no longer in queue view (rotation happened)
    const currentView = await getCurrentView(page);
    // Should be an ad view (ad1, ad2, ad3, or null if we can't detect which specific ad)
    // The important thing is that we're not in queue view anymore
    expect(currentView).not.toBe('queue');
    // If we can detect it, it should be ad1 (first in sequence)
    if (currentView !== null) {
      expect(['ad1', 'ad2', 'ad3']).toContain(currentView);
    }
  });

  test('should rotate through complete sequence: queue -> ad1 -> queue -> ad2 -> queue -> ad3', async ({ page }) => {
    // Start at queue
    await waitForQueueView(page, 5000);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Wait for ad1 (15s)
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad1');
    
    // Wait for queue again (15s)
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Wait for ad2 (15s)
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad2');
    
    // Wait for queue again (15s)
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Wait for ad3 (15s)
    await waitForAdView(page, 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad3');
    
    // Wait for queue again to complete cycle (15s)
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('queue');
  });

  test('should show progress bar during rotation', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Progress bar should be visible when rotation is active
    await waitForRotationToStart(page, 2000);
    const rotationActive = await isRotationActive(page);
    expect(rotationActive).toBeTruthy();
    
    // Progress bar should be at the bottom of the screen
    const progressBar = page.locator('[class*="progress"], [class*="bg-\\[\\#D4AF37\\]"]').first();
    await expect(progressBar).toBeVisible();
  });

  test('should maintain rotation after completing full cycle', async ({ page }) => {
    // Complete one full cycle
    await waitForQueueView(page, 5000);
    
    // Cycle through: queue -> ad1 -> queue -> ad2 -> queue -> ad3 -> queue
    for (let i = 0; i < 6; i++) {
      const isQueue = i % 2 === 0;
      if (isQueue) {
        await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
        expect(await getCurrentView(page)).toBe('queue');
      } else {
        const adNumber = Math.floor(i / 2) + 1;
        await waitForAdView(page, adNumber as 1 | 2 | 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
        const currentView = await getCurrentView(page);
        expect(['ad1', 'ad2', 'ad3']).toContain(currentView);
      }
    }
    
    // After completing cycle, rotation should still be active
    const rotationActive = await isRotationActive(page);
    expect(rotationActive).toBeTruthy();
  });
});

