import type { ShopPublicConfig, ShopListItem } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface ShopsApi {
  getShopConfig(shopSlug: string): Promise<ShopPublicConfig>;
  getAllShops(): Promise<ShopListItem[]>;
  getProjects(): Promise<Array<{ id: number; slug: string; name: string; path: string }>>;
}

export function createShopsApi(client: BaseApiClient): ShopsApi {
  const c = client as any;
  return {
    getShopConfig: (shopSlug) => c.get(`/shops/${shopSlug}/config`),
    getAllShops: () => c.get('/shops'),
    getProjects: () => c.get('/projects'),
  };
}
