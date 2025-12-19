import { test, expect } from '../helpers/fixtures.js';
import { 
  enterKioskMode, 
  waitForQueueView, 
  waitForAdView,
  getCurrentView,
  clickAdToSkip,
  isRotationActive,
  waitForRotationToStop,
  waitForRotationToStart,
  KIOSK_TIMINGS,
} from '../helpers/kiosk.js';
import { loginAsBarber } from '../helpers/auth.js';

test.describe('Kiosk Mode Ad Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBarber(page);
    await enterKioskMode(page);
  });

  test('should skip to queue view when clicking on ad', async ({ page }) => {
    // Wait for initial queue view
    await waitForQueueView(page, 5000);
    
    // Wait for ad1 to appear
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad1');
    
    // Click on ad to skip
    await clickAdToSkip(page);
    
    // Should immediately show queue view
    await waitForQueueView(page, 1000);
    expect(await getCurrentView(page)).toBe('queue');
  });

  test('should pause rotation when manually viewing queue', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Wait for ad to appear
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Click to go back to queue
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    
    // Rotation should be paused (progress bar should disappear)
    await waitForRotationToStop(page, 2000);
    const rotationActive = await isRotationActive(page);
    expect(rotationActive).toBeFalsy();
  });

  test('should restart rotation after idle timeout', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Wait for ad and click to skip
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    
    // Verify rotation is paused
    await waitForRotationToStop(page, 2000);
    expect(await isRotationActive(page)).toBeFalsy();
    
    // Wait for idle timeout (10s) + tolerance
    await waitForRotationToStart(page, KIOSK_TIMINGS.IDLE_TIMEOUT + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Rotation should have restarted
    const rotationActive = await isRotationActive(page);
    expect(rotationActive).toBeTruthy();
  });

  test('should show queue view immediately when clicking any ad', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Test clicking ad1
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Test clicking ad2
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    expect(await getCurrentView(page)).toBe('queue');
    
    // Test clicking ad3
    await waitForAdView(page, 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    expect(await getCurrentView(page)).toBe('queue');
  });

  test('should hide progress bar when rotation is paused', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Verify progress bar is visible during rotation
    await waitForRotationToStart(page, 2000);
    expect(await isRotationActive(page)).toBeTruthy();
    
    // Click ad to pause
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    
    // Progress bar should be hidden
    await waitForRotationToStop(page, 2000);
    expect(await isRotationActive(page)).toBeFalsy();
  });

  test('should allow multiple manual queue views', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Click to view queue multiple times
    for (let i = 0; i < 3; i++) {
      // Wait for ad
      await waitForAdView(page, 'any', KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
      
      // Click to skip to queue
      await clickAdToSkip(page);
      await waitForQueueView(page, 1000);
      expect(await getCurrentView(page)).toBe('queue');
      
      // Verify rotation is paused
      expect(await isRotationActive(page)).toBeFalsy();
      
      // Wait a bit before next iteration
      await page.waitForTimeout(1000);
    }
  });

  test('should resume rotation sequence from correct ad after idle timeout', async ({ page }) => {
    await waitForQueueView(page, 5000);
    
    // Wait for ad2 to appear
    await waitForAdView(page, 1, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForQueueView(page, KIOSK_TIMINGS.AD_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    await waitForAdView(page, 2, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // Click to skip
    await clickAdToSkip(page);
    await waitForQueueView(page, 1000);
    
    // Wait for idle timeout to restart rotation
    await waitForRotationToStart(page, KIOSK_TIMINGS.IDLE_TIMEOUT + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    
    // After restart, should continue from ad2 -> queue -> ad3 sequence
    // Wait for next ad (should be ad3)
    await waitForAdView(page, 3, KIOSK_TIMINGS.QUEUE_VIEW_DURATION + KIOSK_TIMINGS.ROTATION_TOLERANCE);
    expect(await getCurrentView(page)).toBe('ad3');
  });
});

