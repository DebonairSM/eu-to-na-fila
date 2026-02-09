import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { api } from '@/lib/api';
import type { HomeContent, ShopTheme } from '@eutonafila/shared';
import { DEFAULT_HOME_CONTENT, DEFAULT_THEME } from '@eutonafila/shared';
import { useShopSlug } from './ShopSlugContext';
import { config as appConfig } from '@/lib/config';

export type { ShopTheme };

const defaultHomeContent: HomeContent = DEFAULT_HOME_CONTENT;

export interface ShopConfig {
  name: string;
  theme: ShopTheme;
  path: string;
  homeContent: HomeContent;
}

interface ShopConfigContextValue {
  config: ShopConfig;
  isLoading: boolean;
  error: string | null;
}

const defaultTheme: Required<ShopTheme> = DEFAULT_THEME;

const defaultConfig: ShopConfig = {
  name: appConfig.name,
  theme: defaultTheme,
  path: appConfig.path,
  homeContent: defaultHomeContent,
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
    const cached = cache.get(shopSlug);
    if (cached) {
      setConfig(cached);
      setIsLoading(false);
      setError(null);
      applyTheme(cached.theme);
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
          path: data.path,
          homeContent: data.homeContent ?? defaultHomeContent,
        };
        cache.set(shopSlug, shopConfig);
        setConfig(shopConfig);
        setError(null);
        applyTheme(shopConfig.theme);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load shop config');
        setConfig(defaultConfig);
        applyTheme(defaultTheme);
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
