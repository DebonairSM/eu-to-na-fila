import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { api, type HomeContent } from '@/lib/api';
import { useShopSlug } from './ShopSlugContext';
import { config as appConfig } from '@/lib/config';

export interface ShopTheme {
  primary: string;
  accent: string;
}

/** Default home content when API does not return it (fallback). */
const defaultHomeContent: HomeContent = {
  hero: { badge: 'Sangão, Santa Catarina', subtitle: 'Entre na fila online', ctaJoin: 'Entrar na Fila', ctaLocation: 'Como Chegar' },
  services: { sectionTitle: 'Serviços' },
  about: {
    sectionTitle: 'Sobre',
    imageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=1000&fit=crop&q=80',
    features: [
      { icon: 'schedule', text: 'Fila online' },
      { icon: 'workspace_premium', text: 'Produtos premium' },
      { icon: 'groups', text: 'Equipe experiente' },
      { icon: 'local_parking', text: 'Estacionamento fácil' },
    ],
  },
  location: {
    sectionTitle: 'Localização',
    address: 'R. João M Silvano, 281 - Morro Grande\nSangão - SC, 88717-000',
    addressLink: 'https://www.google.com/maps/search/?api=1&query=R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
    hours: 'Segunda a Sábado: 9:00 - 19:00\nDomingo: Fechado',
    phone: '(48) 99835-4097',
    phoneHref: 'tel:+5548998354097',
    languages: 'Português & English',
    mapQuery: 'R.+João+M+Silvano,+281+-+Morro+Grande,+Sangão+-+SC,+88717-000',
  },
};

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

const defaultTheme: ShopTheme = {
  primary: '#3E2723',
  accent: '#FFD54F',
};

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
