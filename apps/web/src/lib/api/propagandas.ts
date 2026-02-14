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

export interface QuoteResult {
  amount_cents: number;
  amount_display: string;
}

export function createPropagandasApi(client: BaseApiClient) {
  const c = client as BaseApiClient & { get: (path: string) => Promise<unknown>; post: (path: string, body: unknown) => Promise<unknown>; getBaseUrl: () => string };
  return {
    getShopsForAds(): Promise<ShopForAds[]> {
      return c.get('/public/propagandas/shops') as Promise<ShopForAds[]>;
    },
    getQuote(durationSeconds: number, shopCount?: number): Promise<QuoteResult> {
      const params = new URLSearchParams({ duration_seconds: String(durationSeconds) });
      if (shopCount != null) params.set('shop_count', String(shopCount));
      return c.get(`/public/propagandas/quote?${params}`) as Promise<QuoteResult>;
    },
    createCheckout(payload: CreateAdOrderPayload): Promise<{ checkoutUrl?: string; sessionId: string; orderId: number }> {
      return c.post('/public/propagandas/checkout', payload) as Promise<{ checkoutUrl?: string; sessionId: string; orderId: number }>;
    },
    getOrderAfterPayment(sessionId: string): Promise<{ orderId: number }> {
      return c.get(`/public/propagandas/orders/complete?session_id=${encodeURIComponent(sessionId)}`) as Promise<{ orderId: number }>;
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
