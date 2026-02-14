import type { BaseApiClient } from './client.js';

export interface ShopForAds {
  id: number;
  name: string;
}

export interface CreateAdOrderPayload {
  advertiser_name: string;
  advertiser_email: string;
  advertiser_phone?: string;
  duration_seconds: 10 | 15 | 20 | 30;
  shop_ids: number[];
}

export function createPropagandasApi(client: BaseApiClient) {
  const c = client as BaseApiClient & { get: (path: string) => Promise<unknown>; post: (path: string, body: unknown) => Promise<unknown>; getBaseUrl: () => string };
  return {
    getShopsForAds(): Promise<ShopForAds[]> {
      return c.get('/public/propagandas/shops') as Promise<ShopForAds[]>;
    },
    createAdOrder(payload: CreateAdOrderPayload): Promise<{ orderId: number }> {
      return c.post('/public/propagandas/orders', payload) as Promise<{ orderId: number }>;
    },
    async uploadAdOrderImage(orderId: number, file: File): Promise<{ ok: boolean; imageUrl: string }> {
      const baseUrl = c.getBaseUrl();
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${baseUrl}/public/propagandas/orders/${orderId}/image`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string; error?: string })?.message ?? (err as { message?: string; error?: string })?.error ?? 'Upload failed');
      }
      return res.json();
    },
  };
}
