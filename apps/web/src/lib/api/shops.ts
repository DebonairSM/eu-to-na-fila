import type { ShopPublicConfig, ShopListItem } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface ShopsApi {
  getShopConfig(shopSlug: string): Promise<ShopPublicConfig>;
  getAllShops(): Promise<ShopListItem[]>;
  getProjects(): Promise<Array<{ id: number; slug: string; name: string; path: string }>>;
  setTemporaryStatus(shopSlug: string, data: { isOpen: boolean; durationMinutes: number; reason?: string }): Promise<{ success: boolean; until: string }>;
  clearTemporaryStatus(shopSlug: string): Promise<{ success: boolean }>;
}

export function createShopsApi(client: BaseApiClient): ShopsApi {
  const c = client as any;
  return {
    getShopConfig: (shopSlug) => c.get(`/shops/${shopSlug}/config`),
    getAllShops: () => c.get('/shops'),
    getProjects: () => c.get(`/projects?_=${Date.now()}`),
    setTemporaryStatus: (shopSlug, data) => c.patch(`/shops/${shopSlug}/temporary-status`, data),
    clearTemporaryStatus: (shopSlug) => c.del(`/shops/${shopSlug}/temporary-status`),
  };
}
