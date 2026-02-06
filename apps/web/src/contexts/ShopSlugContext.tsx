import { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { config } from '@/lib/config';

const ShopSlugContext = createContext<string>(config.slug);

export function ShopSlugProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  const fromUrl = searchParams.get('shop');
  const slug = useMemo(
    () => (fromUrl && fromUrl.trim() ? fromUrl.trim() : config.slug),
    [fromUrl]
  );
  return (
    <ShopSlugContext.Provider value={slug}>{children}</ShopSlugContext.Provider>
  );
}

export function useShopSlug(): string {
  return useContext(ShopSlugContext);
}
