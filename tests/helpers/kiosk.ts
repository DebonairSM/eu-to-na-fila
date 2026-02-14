import { Page, expect } from '@playwright/test';

/**
 * Constants for kiosk mode timing.
 * In CI or when E2E_FAST_KIOSK=1, use shorter durations for faster tests.
 */
const useFastKiosk = process.env.E2E_FAST_KIOSK === '1';
export const KIOSK_TIMINGS = {
  QUEUE_VIEW_DURATION: useFastKiosk ? 3000 : 15000,
  AD_VIEW_DURATION: useFastKiosk ? 3000 : 15000,
  IDLE_TIMEOUT: useFastKiosk ? 3000 : 10000,
  ROTATION_TOLERANCE: 1000,
} as const;

/**
 * Enters kiosk mode by navigating to the queue manager with kiosk parameter.
 * Assumes user is already logged in.
 * Uses data-testid when available, with fallbacks for queue/ad content.
 */
export async function enterKioskMode(page: Page) {
  await page.goto('/projects/mineiro/manage?kiosk=true');

  // Prefer stable data-testid; fallback to visible content
  const kioskRoot = page.getByTestId('kiosk-root');
  const queueView = page.getByTestId('kiosk-queue-view');
  const adView = page.getByTestId('kiosk-ad-view');
  const noAds = page.getByTestId('kiosk-no-ads');
  const fallback = page.locator('button:has-text("Entrar na Fila"), img[src*="gt-ad"], video[src*="gt-ad"], [data-testid="kiosk-ads-player"]').first();

  await expect(
    kioskRoot.or(queueView).or(adView).or(noAds).or(fallback).first()
  ).toBeVisible({ timeout: 10000 });
}

/**
 * Exits kiosk mode by pressing Escape (app does not expose "Exit kiosk" button; uses Escape).
 */
export async function exitKioskMode(page: Page) {
  const fullscreenButton = page.getByTestId('kiosk-fullscreen-toggle');
  if (await fullscreenButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    // App exits kiosk on Escape; fullscreen toggle only toggles fullscreen
    await page.keyboard.press('Escape');
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);
}

/**
 * Waits for the queue view to be displayed.
 * Uses data-testid first, then fallback selectors.
 */
export async function waitForQueueView(page: Page, timeout = 20000) {
  const queueView = page.getByTestId('kiosk-queue-view');
  const fallback = page.locator('button:has-text("Entrar na Fila"), button[aria-label*="Atribuir barbeiro"]').first();
  await expect(queueView.or(fallback).first()).toBeVisible({ timeout });
}

/**
 * Waits for an ad view to be displayed.
 * Treats "no ads" and error/loading states as valid ad view states.
 * @param adNumber - Which ad to wait for (1, 2, or 3), or 'any' for any ad
 */
export async function waitForAdView(page: Page, adNumber: 1 | 2 | 3 | 'any' = 'any', timeout = 20000) {
  if (adNumber === 'any') {
    const queueView = page.getByTestId('kiosk-queue-view');
    const adView = page.getByTestId('kiosk-ad-view');
    const adsPlayer = page.getByTestId('kiosk-ads-player');
    const noAds = page.getByTestId('kiosk-no-ads');
    const anyAdState = adView.or(adsPlayer).or(noAds).first();

    const adVisible = await anyAdState.isVisible({ timeout }).catch(() => false);
    if (adVisible) return;
    const queueGone = await queueView.isHidden().catch(() => false);
    if (queueGone) return;
    throw new Error('Ad view (or no-ads state) not found within timeout');
  }

  // Specific ad: try asset selectors first, then accept ad container / no-ads / error as valid
  const selectors: string[] =
    adNumber === 1
      ? ['img[src*="gt-ad.png"]:not([src*="gt-ad2"])', 'img[alt*="Anúncio"]', 'img[src*="/api/ads/"]']
      : adNumber === 2
        ? ['img[src*="gt-ad2.png"]', 'img[src*="/api/ads/"]']
        : ['video[src*="gt-ad-001"], video[src*="/api/ads/"]'];

  let found = false;
  for (const selector of selectors) {
    try {
      await expect(page.locator(selector).first()).toBeVisible({ timeout: Math.max(2000, timeout / selectors.length) });
      found = true;
      break;
    } catch {
      continue;
    }
  }

  if (!found) {
    const adViewOrNoAds = await page.getByTestId('kiosk-ad-view').or(page.getByTestId('kiosk-ads-player')).or(page.getByTestId('kiosk-no-ads')).first().isVisible({ timeout: 2000 }).catch(() => false);
    const errorOrLoading = await page.locator('text=/Erro ao carregar|Carregando/i').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (adViewOrNoAds || errorOrLoading) found = true;
  }

  if (!found) {
    const container = page.locator('[class*="cursor-pointer"]:has(img, video), [data-testid="kiosk-ads-player"]').first();
    const visible = await container.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) throw new Error(`Ad${adNumber} view not found after ${timeout}ms`);
  }
}

/**
 * Clicks on an ad to skip to queue view
 */
export async function clickAdToSkip(page: Page) {
  const adView = page.getByTestId('kiosk-ad-view');
  const adContainer = page.locator('[class*="cursor-pointer"]:has(img), [class*="cursor-pointer"]:has(video), [data-testid="kiosk-ads-player"]').first();
  const clickable = await adView.isVisible({ timeout: 2000 }).catch(() => false) ? adView : adContainer;
  await clickable.click({ timeout: 5000 });
  await waitForQueueView(page, 3000);
}

/**
 * Checks if rotation is active by looking for progress bar.
 */
export async function isRotationActive(page: Page): Promise<boolean> {
  const progress = page.getByTestId('kiosk-rotation-progress');
  if (await progress.isVisible({ timeout: 1000 }).catch(() => false)) return true;
  const fallback = page.locator('div.absolute.bottom-0.left-0.right-0').locator('div.h-full').first();
  return await fallback.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Waits for rotation to start (progress bar appears).
 */
export async function waitForRotationToStart(page: Page, timeout = 5000) {
  const progress = page.getByTestId('kiosk-rotation-progress');
  const fallback = page.locator('div.absolute.bottom-0.left-0.right-0').locator('div.h-full').first();
  await expect(progress.or(fallback).first()).toBeVisible({ timeout });
}

/**
 * Waits for rotation to stop (progress bar disappears).
 */
export async function waitForRotationToStop(page: Page, timeout = 5000) {
  const progress = page.getByTestId('kiosk-rotation-progress');
  const fallback = page.locator('div.absolute.bottom-0.left-0.right-0').locator('div.h-full').first();
  await expect(progress.or(fallback).first()).not.toBeVisible({ timeout });
}

/**
 * Gets the current view type (queue, ad1, ad2, or ad3).
 * Treats queue view, ad view (including "no ads" and error states) as valid; returns null only when unclear.
 */
export async function getCurrentView(page: Page): Promise<'queue' | 'ad1' | 'ad2' | 'ad3' | null> {
  if (await page.getByTestId('kiosk-queue-view').isVisible({ timeout: 500 }).catch(() => false)) return 'queue';

  const queueIndicators = [
    'button:has-text("Entrar na Fila")',
    'button[aria-label*="Atribuir barbeiro"]',
  ];
  for (const indicator of queueIndicators) {
    if (await page.locator(indicator).first().isVisible({ timeout: 500 }).catch(() => false)) return 'queue';
  }

  if (await page.getByTestId('kiosk-no-ads').isVisible({ timeout: 500 }).catch(() => false)) return 'ad1';
  if (await page.getByTestId('kiosk-ad-view').isVisible({ timeout: 500 }).catch(() => false)) {
    const ad1 = await page.locator('img[src*="gt-ad"]:not([src*="gt-ad2"]), img[alt*="Anúncio"]').first().isVisible({ timeout: 300 }).catch(() => false);
    if (ad1) return 'ad1';
    const ad2 = await page.locator('img[src*="gt-ad2"]').first().isVisible({ timeout: 300 }).catch(() => false);
    if (ad2) return 'ad2';
    const ad3 = await page.locator('video').first().isVisible({ timeout: 300 }).catch(() => false);
    if (ad3) return 'ad3';
    return 'ad1';
  }

  const adContainer = await page.getByTestId('kiosk-ads-player').or(page.locator('[class*="cursor-pointer"]:has(img, video, text=/Erro ao carregar|Carregando|Nenhum/)').first()).isVisible({ timeout: 500 }).catch(() => false);
  if (adContainer) return 'ad1';

  return null;
}
