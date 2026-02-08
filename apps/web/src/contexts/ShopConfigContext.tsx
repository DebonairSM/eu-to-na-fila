import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { api } from '@/lib/api';
import { useShopSlug } from './ShopSlugContext';
import { config as appConfig } from '@/lib/config';

export interface ShopTheme {
  primary: string;
  accent: string;
}

export interface ShopConfig {
  name: string;
  theme: ShopTheme;
  path: string;
}

interface ShopConfigContextValue {
  config: ShopConfig;
  isLoading: boolean;
  error: string | null;
}

const defaultTheme: ShopTheme = {
  primary: '#3E2723',
  accent: '#FFD54F',
};

const defaultConfig: ShopConfig = {
  name: appConfig.name,
  theme: defaultTheme,
  path: appConfig.path,
};

const ShopConfigContext = createContext<ShopConfigContextValue>({
  config: defaultConfig,
  isLoading: false,
  error: null,
});

const cache = new Map<string, ShopConfig>();

function applyTheme(theme: ShopTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--shop-primary', theme.primary);
  document.documentElement.style.setProperty('--shop-accent', theme.accent);
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
