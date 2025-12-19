import { Page, expect } from '@playwright/test';

/**
 * Constants for kiosk mode timing
 */
export const KIOSK_TIMINGS = {
  QUEUE_VIEW_DURATION: 15000, // 15 seconds
  AD_VIEW_DURATION: 15000, // 15 seconds
  IDLE_TIMEOUT: 10000, // 10 seconds
  ROTATION_TOLERANCE: 1000, // 1 second tolerance for timing tests
} as const;

/**
 * Enters kiosk mode by navigating to the queue manager with kiosk parameter
 * Assumes user is already logged in
 */
export async function enterKioskMode(page: Page) {
  await page.goto('/mineiro/manage?kiosk=true');
  
  // Wait for kiosk mode to be active
  // The kiosk mode should show the queue view or an ad view
  await expect(
    page.locator('[data-kiosk-mode="true"], [class*="kiosk"], [class*="queue-view"]').first()
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Exits kiosk mode by clicking the exit button or pressing Escape
 */
export async function exitKioskMode(page: Page) {
  // Try to find exit button (gear icon or exit button)
  const exitButton = page.locator('button[aria-label*="exit"], button[aria-label*="sair"], [class*="exit"], [data-testid="exit-kiosk"]').first();
  
  if (await exitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await exitButton.click();
  } else {
    // Fallback: press Escape key
    await page.keyboard.press('Escape');
  }
  
  // Wait for kiosk mode to be inactive
  await page.waitForTimeout(500);
}

/**
 * Waits for the queue view to be displayed
 */
export async function waitForQueueView(page: Page, timeout = 20000) {
  // Look for queue-related elements
  await expect(
    page.locator('[class*="queue"], [data-view="queue"], h2:has-text("Fila"), h1:has-text("Fila")').first()
  ).toBeVisible({ timeout });
}

/**
 * Waits for an ad view to be displayed
 * @param adNumber - Which ad to wait for (1, 2, or 3), or 'any' for any ad
 */
export async function waitForAdView(page: Page, adNumber: 1 | 2 | 3 | 'any' = 'any', timeout = 20000) {
  if (adNumber === 'any') {
    // Wait for any ad view
    await expect(
      page.locator('img[src*="gt-ad"], video[src*="gt-ad"], [data-view="ad1"], [data-view="ad2"], [data-view="ad3"], [class*="ad"]').first()
    ).toBeVisible({ timeout });
  } else {
    // Wait for specific ad
    const adSelector = `[data-view="ad${adNumber}"], img[src*="gt-ad${adNumber === 1 ? '' : adNumber}"], video[src*="gt-ad"]`;
    await expect(page.locator(adSelector).first()).toBeVisible({ timeout });
  }
}

/**
 * Clicks on an ad to skip to queue view
 */
export async function clickAdToSkip(page: Page) {
  // Find clickable ad container
  const adContainer = page.locator('[class*="cursor-pointer"]:has(img), [class*="cursor-pointer"]:has(video)').first();
  await adContainer.click({ timeout: 5000 });
  
  // Wait for queue view to appear
  await waitForQueueView(page, 3000);
}

/**
 * Checks if rotation is active by looking for progress bar
 */
export async function isRotationActive(page: Page): Promise<boolean> {
  const progressBar = page.locator('[class*="progress"], [class*="bg-\\[\\#D4AF37\\]"]').first();
  return await progressBar.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Waits for rotation to start (progress bar appears)
 */
export async function waitForRotationToStart(page: Page, timeout = 5000) {
  await expect(
    page.locator('[class*="progress"], [class*="bg-\\[\\#D4AF37\\]"]').first()
  ).toBeVisible({ timeout });
}

/**
 * Waits for rotation to stop (progress bar disappears)
 */
export async function waitForRotationToStop(page: Page, timeout = 5000) {
  await expect(
    page.locator('[class*="progress"], [class*="bg-\\[\\#D4AF37\\]"]').first()
  ).not.toBeVisible({ timeout });
}

/**
 * Gets the current view type (queue, ad1, ad2, or ad3)
 * Returns null if cannot determine
 */
export async function getCurrentView(page: Page): Promise<'queue' | 'ad1' | 'ad2' | 'ad3' | null> {
  // Check for queue view
  const queueVisible = await page.locator('[class*="queue-view"], h2:has-text("Fila")').first()
    .isVisible({ timeout: 1000 }).catch(() => false);
  if (queueVisible) return 'queue';
  
  // Check for ad1 (gt-ad.png)
  const ad1Visible = await page.locator('img[src*="gt-ad.png"]:not([src*="gt-ad2"])').first()
    .isVisible({ timeout: 1000 }).catch(() => false);
  if (ad1Visible) return 'ad1';
  
  // Check for ad2 (gt-ad2.png)
  const ad2Visible = await page.locator('img[src*="gt-ad2.png"]').first()
    .isVisible({ timeout: 1000 }).catch(() => false);
  if (ad2Visible) return 'ad2';
  
  // Check for ad3 (video)
  const ad3Visible = await page.locator('video[src*="gt-ad-001.mp4"]').first()
    .isVisible({ timeout: 1000 }).catch(() => false);
  if (ad3Visible) return 'ad3';
  
  return null;
}

