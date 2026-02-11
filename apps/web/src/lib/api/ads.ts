import type { BaseApiClient } from './client.js';
import { ApiError } from './errors.js';

interface Ad {
  id: number; companyId: number; shopId: number | null; position: number; enabled: boolean;
  mediaType: string; mimeType: string; bytes: number; storageKey: string; publicUrl: string;
  etag: string | null; version: number; createdAt: Date; updatedAt: Date;
}

export interface AdsApi {
  uploadAd(file: File, shopId?: number | null, position?: number): Promise<{ message: string; ad: { id: number; position: number; enabled: boolean; mediaType: string; mimeType: string; publicUrl: string; version: number } }>;
  getAdsManifest(shopSlug: string, options?: { timeout?: number }): Promise<{ manifestVersion: number; ads: Array<{ id: number; position: number; mediaType: string; url: string; version: number }> }>;
  getAds(shopId?: number): Promise<Ad[]>;
  updateAd(adId: number, data: { enabled?: boolean; position?: number; shopId?: number | null }): Promise<Ad>;
  deleteAd(adId: number): Promise<{ message: string }>;
}

export function createAdsApi(client: BaseApiClient): AdsApi {
  const c = client as any;
  return {
    async uploadAd(file, shopId, position) {
      const formData = new FormData();
      formData.append('file', file);
      if (shopId !== undefined && shopId !== null) formData.append('shopId', shopId.toString());
      if (position !== undefined) formData.append('position', position.toString());

      const headers: Record<string, string> = {};
      if (c.authToken) headers['Authorization'] = `Bearer ${c.authToken}`;

      const uploadTimeoutMs = 120_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), uploadTimeoutMs);

      let response: Response;
      try {
        response = await fetch(`${c.baseUrl}/ads/uploads`, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          throw new ApiError('Upload timed out. Try a smaller file or check your connection.', 408, 'UPLOAD_TIMEOUT');
        }
        if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
          throw new ApiError('Network error during upload (connection lost or SSL error). Try again or use a smaller file.', 0, 'NETWORK_ERROR');
        }
        throw err;
      }
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.error || `Upload failed: ${response.statusText}`, response.status, errorData.code || 'UPLOAD_ERROR', errorData.errors);
      }
      return response.json();
    },
    async getAdsManifest(shopSlug, options) {
      const timeoutMs = options?.timeout ?? 15000;
      return c.get(`/ads/public/manifest?shopSlug=${encodeURIComponent(shopSlug)}`, timeoutMs);
    },
    getAds: (shopId) => {
      const query = shopId ? `?shopId=${shopId}` : '';
      return c.get(`/ads${query}`);
    },
    updateAd: (adId, data) => c.patch(`/ads/${adId}`, data),
    deleteAd: (adId) => c.del(`/ads/${adId}`),
  };
}
