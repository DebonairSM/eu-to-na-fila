import type { CSSProperties } from 'react';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { api } from '@/lib/api';
import type { HomeContent, ShopTheme, ShopSettings, ShopStyleResolved } from '@eutonafila/shared';
import { DEFAULT_HOME_CONTENT, DEFAULT_THEME, DEFAULT_SETTINGS } from '@eutonafila/shared';
import { resolveShopStyle, shopStyleConfigSchema } from '@eutonafila/shared';
import { useShopSlug } from './ShopSlugContext';
import { config as appConfig } from '@/lib/config';
import { ensureGoogleFontsLoaded, fontTokenToStack } from '@/lib/shopStyle';
import { ensureMaterialSymbolsFontFace } from '@/lib/materialSymbols';

export type { ShopTheme };

const defaultHomeContent: HomeContent = DEFAULT_HOME_CONTENT;

export interface ShopConfig {
  name: string;
  theme: ShopTheme;
  style: ShopStyleResolved;
  path: string;
  homeContent: HomeContent;
  settings: ShopSettings;
}

interface ShopConfigContextValue {
  config: ShopConfig;
  isLoading: boolean;
  error: string | null;
}

const defaultTheme: Required<ShopTheme> = DEFAULT_THEME;
const defaultStyle: ShopStyleResolved = resolveShopStyle(shopStyleConfigSchema.parse({}));

const defaultConfig: ShopConfig = {
  name: appConfig.name,
  theme: defaultTheme,
  style: defaultStyle,
  path: appConfig.path,
  homeContent: defaultHomeContent,
  settings: DEFAULT_SETTINGS,
};

const ShopConfigContext = createContext<ShopConfigContextValue>({
  config: defaultConfig,
  isLoading: false,
  error: null,
});

const cache = new Map<string, ShopConfig>();

function applyTheme(theme: ShopTheme) {
  if (typeof document === 'undefined') return;
  const t = { ...defaultTheme, ...theme };
  document.documentElement.style.setProperty('--shop-primary', t.primary);
  document.documentElement.style.setProperty('--shop-accent', t.accent);
  document.documentElement.style.setProperty('--shop-background', t.background ?? '#0a0a0a');
  document.documentElement.style.setProperty('--shop-surface-primary', t.surfacePrimary ?? '#0a0a0a');
  document.documentElement.style.setProperty('--shop-surface-secondary', t.surfaceSecondary ?? '#1a1a1a');
  document.documentElement.style.setProperty('--shop-nav-bg', t.navBg ?? '#0a0a0a');
  document.documentElement.style.setProperty('--shop-text-primary', t.textPrimary ?? '#ffffff');
  document.documentElement.style.setProperty('--shop-text-secondary', t.textSecondary ?? 'rgba(255,255,255,0.7)');
  document.documentElement.style.setProperty('--shop-border-color', t.borderColor ?? 'rgba(255,255,255,0.08)');
  document.documentElement.style.setProperty('--shop-text-on-accent', t.textOnAccent ?? '#0a0a0a');
  document.documentElement.style.setProperty('--shop-accent-hover', t.accentHover ?? '#E8C547');
}

function applyStyle(style: ShopStyleResolved) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.shopPreset = style.preset;
  document.documentElement.dataset.shopLayout = style.layout;

  // Fonts: load and apply stacks.
  ensureGoogleFontsLoaded([style.headingFont, style.bodyFont]);
  document.documentElement.style.setProperty('--shop-font-heading', fontTokenToStack(style.headingFont));
  document.documentElement.style.setProperty('--shop-font-body', fontTokenToStack(style.bodyFont));

  // Typography tokens.
  document.documentElement.style.setProperty('--shop-heading-weight', String(style.headingWeight));
  document.documentElement.style.setProperty('--shop-heading-letter-spacing', style.headingLetterSpacing);
  document.documentElement.style.setProperty('--shop-heading-transform', style.headingTransform);

  // Shape tokens: reuse existing radius variables already defined in globals.css.
  document.documentElement.style.setProperty('--radius-sm', style.radius.sm);
  document.documentElement.style.setProperty('--radius-md', style.radius.md);
  document.documentElement.style.setProperty('--radius-lg', style.radius.lg);
  document.documentElement.style.setProperty('--radius-xl', style.radius.xl);
  document.documentElement.style.setProperty('--radius-2xl', style.radius['2xl']);
  document.documentElement.style.setProperty('--radius-full', style.radius.full);

  // Borders, icons, dividers.
  document.documentElement.style.setProperty('--shop-border-width', style.borderWidth);
  document.documentElement.style.setProperty('--shop-border-style', style.borderStyle);
  document.documentElement.style.setProperty('--shop-icon-weight', String(style.iconWeight));
  document.documentElement.style.setProperty('--shop-divider-style', style.dividerStyle);
}

function applyFavicon(faviconUrl: string | undefined) {
  if (typeof document === 'undefined') return;
  const href = (faviconUrl && faviconUrl.trim()) || null;
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
  const defaultHref = `${base}favicon.svg`;
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = href || defaultHref;
  const appleTouch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (appleTouch) appleTouch.href = href || `${base}icon-192.png`;
}

export function ShopConfigProvider({ children }: { children: React.ReactNode }) {
  const shopSlug = useShopSlug();
  const [config, setConfig] = useState<ShopConfig | null>(() =>
    cache.get(shopSlug) ?? null
  );
  const [isLoading, setIsLoading] = useState(!cache.has(shopSlug));
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<string | null>(null);

  useEffect(() => {
    ensureMaterialSymbolsFontFace();
  }, []);

  useEffect(() => {
    const cached = cache.get(shopSlug);
    if (cached) {
      setConfig(cached);
      setIsLoading(false);
      setError(null);
      applyTheme(cached.theme);
      applyStyle(cached.style);
      applyFavicon(cached.homeContent?.branding?.faviconUrl);
      return;
    }

    if (fetchingRef.current === shopSlug) return;
    fetchingRef.current = shopSlug;
    setIsLoading(true);
    setError(null);

    api
      .getShopConfig(shopSlug)
      .then((data) => {
        const shopConfig: ShopConfig = {
          name: data.name,
          theme: data.theme,
          style: data.style ?? defaultStyle,
          path: data.path,
          homeContent: data.homeContent ?? defaultHomeContent,
          settings: data.settings ?? DEFAULT_SETTINGS,
        };
        cache.set(shopSlug, shopConfig);
        setConfig(shopConfig);
        setError(null);
        applyTheme(shopConfig.theme);
        applyStyle(shopConfig.style);
        applyFavicon(shopConfig.homeContent?.branding?.faviconUrl);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shop config');
        setConfig(defaultConfig);
        applyTheme(defaultTheme);
        applyStyle(defaultStyle);
        applyFavicon(undefined);
      })
      .finally(() => {
        setIsLoading(false);
        fetchingRef.current = null;
      });
  }, [shopSlug]);

  const value = useMemo<ShopConfigContextValue>(
    () => ({
      config: config ?? defaultConfig,
      isLoading,
      error,
    }),
    [config, isLoading, error]
  );

  return (
    <ShopConfigContext.Provider value={value}>
      {children}
    </ShopConfigContext.Provider>
  );
}

export function useShopConfig(): ShopConfigContextValue {
  return useContext(ShopConfigContext);
}

/** CSS custom properties for preview only (scoped to a div so the rest of the page is unchanged). */
export function getPreviewScopedStyles(config: ShopConfig): CSSProperties {
  const t = { ...defaultTheme, ...config.theme };
  const s = config.style;
  ensureGoogleFontsLoaded([s.headingFont, s.bodyFont]);
  return {
    ['--shop-primary' as string]: t.primary,
    ['--shop-accent' as string]: t.accent,
    ['--shop-background' as string]: t.background ?? '#0a0a0a',
    ['--shop-surface-primary' as string]: t.surfacePrimary ?? '#0a0a0a',
    ['--shop-surface-secondary' as string]: t.surfaceSecondary ?? '#1a1a1a',
    ['--shop-nav-bg' as string]: t.navBg ?? '#0a0a0a',
    ['--shop-text-primary' as string]: t.textPrimary ?? '#ffffff',
    ['--shop-text-secondary' as string]: t.textSecondary ?? 'rgba(255,255,255,0.7)',
    ['--shop-border-color' as string]: t.borderColor ?? 'rgba(255,255,255,0.08)',
    ['--shop-text-on-accent' as string]: t.textOnAccent ?? '#0a0a0a',
    ['--shop-accent-hover' as string]: t.accentHover ?? '#E8C547',
    ['--shop-font-heading' as string]: fontTokenToStack(s.headingFont),
    ['--shop-font-body' as string]: fontTokenToStack(s.bodyFont),
    ['--shop-heading-weight' as string]: String(s.headingWeight),
    ['--shop-heading-letter-spacing' as string]: s.headingLetterSpacing,
    ['--shop-heading-transform' as string]: s.headingTransform,
    ['--radius-sm' as string]: s.radius.sm,
    ['--radius-md' as string]: s.radius.md,
    ['--radius-lg' as string]: s.radius.lg,
    ['--radius-xl' as string]: s.radius.xl,
    ['--radius-2xl' as string]: s.radius['2xl'],
    ['--radius-full' as string]: s.radius.full,
    ['--shop-border-width' as string]: s.borderWidth,
    ['--shop-border-style' as string]: s.borderStyle,
    ['--shop-icon-weight' as string]: String(s.iconWeight),
    ['--shop-divider-style' as string]: s.dividerStyle,
  };
}

export { ShopConfigContext };
