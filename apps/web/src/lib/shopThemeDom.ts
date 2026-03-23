import type { ShopTheme } from '@eutonafila/shared';
import { DEFAULT_THEME } from '@eutonafila/shared';
import { getShopSlugFromLocation } from '@/lib/shopSlugFromPath';

export const SHOP_THEME_STORAGE_KEY_PREFIX = 'eutonafila_shop_theme_v1:';

function mergedTheme(theme: ShopTheme): Required<ShopTheme> {
  return { ...DEFAULT_THEME, ...theme };
}

/** Apply shop color tokens to `document.documentElement` (overrides :root from CSS). */
export function applyShopThemeToDocument(theme: ShopTheme): void {
  if (typeof document === 'undefined') return;
  const t = mergedTheme(theme);
  const r = document.documentElement.style;
  r.setProperty('--shop-primary', t.primary);
  r.setProperty('--shop-accent', t.accent);
  r.setProperty('--shop-background', t.background);
  r.setProperty('--shop-surface-primary', t.surfacePrimary);
  r.setProperty('--shop-surface-secondary', t.surfaceSecondary);
  r.setProperty('--shop-nav-bg', t.navBg);
  r.setProperty('--shop-text-primary', t.textPrimary);
  r.setProperty('--shop-text-secondary', t.textSecondary);
  r.setProperty('--shop-border-color', t.borderColor);
  r.setProperty('--shop-text-on-accent', t.textOnAccent);
  r.setProperty('--shop-accent-hover', t.accentHover);
}

export function persistShopTheme(slug: string, theme: ShopTheme): void {
  try {
    localStorage.setItem(SHOP_THEME_STORAGE_KEY_PREFIX + slug, JSON.stringify(mergedTheme(theme)));
  } catch {
    // ignore quota / private mode
  }
}

/** Restore theme from localStorage for the current URL slug (repeat visits / before React). */
export function restorePersistedShopTheme(): void {
  if (typeof document === 'undefined') return;
  try {
    const slug = getShopSlugFromLocation();
    const raw = localStorage.getItem(SHOP_THEME_STORAGE_KEY_PREFIX + slug);
    if (!raw) return;
    const parsed = JSON.parse(raw) as ShopTheme;
    applyShopThemeToDocument(parsed);
  } catch {
    // ignore invalid JSON
  }
}
