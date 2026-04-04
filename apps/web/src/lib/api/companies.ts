import type { ShopTheme, HomeContent, ShopAdminView, ShopSettings, ShopStyleConfig } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface PlacesLookupLocation {
  name?: string;
  address?: string;
  addressLink?: string;
  mapQuery?: string;
  phone?: string;
  phoneHref?: string;
  hours?: string;
}

export interface PlacesLookupResult {
  location: PlacesLookupLocation;
}

export interface CompaniesApi {
  getCompanyDashboard(companyId: number): Promise<{ totalShops: number; activeAds: number; totalAds: number }>;
  getCompanyShops(companyId: number): Promise<ShopAdminView[]>;
  createCompanyShop(companyId: number, data: { name: string; slug?: string; domain?: string; path?: string; apiBase?: string }): Promise<ShopAdminView>;
  uploadShopHomeImage(companyId: number, shopId: number, file: File): Promise<{ url: string }>;
  uploadDraftHomeImage(companyId: number, file: File): Promise<{ url: string }>;
  createFullShop(companyId: number, data: {
    name: string; slug?: string; domain?: string; path?: string; apiBase?: string;
    ownerUsername?: string | null; staffUsername?: string | null;
    ownerPassword: string; staffPassword: string;
    theme?: Partial<ShopTheme>; homeContent?: Partial<HomeContent>;
    homeContentByLocale?: Record<string, Partial<HomeContent>>;
    settings?: Partial<ShopSettings>;
    services: Array<{ name: string; description?: string; duration: number; price?: number }>;
    barbers: Array<{ name: string; email?: string; phone?: string }>;
  }): Promise<{
    shop: ShopAdminView;
    services: Array<{ id: number; name: string; duration: number; price: number | null }>;
    barbers: Array<{ id: number; name: string }>;
  }>;
  updateCompanyShop(companyId: number, shopId: number, data: {
    name?: string; slug?: string; domain?: string | null; path?: string | null; apiBase?: string | null;
    theme?: Partial<ShopTheme> & { style?: ShopStyleConfig };
    homeContent?: Partial<HomeContent>;
    homeContentByLocale?: Record<string, Partial<HomeContent>>;
    settings?: Partial<ShopSettings>;
    ownerUsername?: string | null; staffUsername?: string | null;
    ownerPassword?: string; staffPassword?: string;
  }): Promise<ShopAdminView>;
  deleteCompanyShop(companyId: number, shopId: number): Promise<{ success: boolean; message: string }>;
  updateCompanyShopBarber(companyId: number, shopId: number, barberId: number, data: { username?: string | null; password?: string; email?: string | null }): Promise<{ id: number; name: string; username: string | null; email?: string | null }>;
  lookupPlacesByAddress(companyId: number, address: string): Promise<PlacesLookupResult>;
  getAdOrders(companyId: number, status?: 'pending_approval' | 'approved' | 'rejected'): Promise<AdOrder[]>;
  patchAdOrder(companyId: number, orderId: number, body: { action: 'approve' | 'reject' | 'mark_paid' }): Promise<{ ok: boolean; status?: string; paymentStatus?: string }>;
  getAdPricing(companyId: number): Promise<Record<string, number>>;
  putAdPricing(companyId: number, pricing: { 10?: number; 15?: number; 20?: number; 30?: number }): Promise<Record<string, number>>;
  getCompany(companyId: number): Promise<{ id: number; name: string; propagandasReminderEmail?: string | null }>;
  patchCompany(companyId: number, data: { propagandas_reminder_email?: string | null }): Promise<{ id: number; name: string; propagandasReminderEmail?: string | null }>;
  getCompanyUsage(companyId: number, params?: { days?: number }): Promise<CompanyUsageResponse>;
  getAdsUsage(): Promise<AdsUsageResponse>;
  getCompanyUsageAlerts(companyId: number, params?: { resolved?: 'true' | 'false' }): Promise<{ alerts: CompanyUsageAlert[] }>;
  resolveUsageAlert(companyId: number, alertId: number): Promise<{ ok: boolean; resolvedAt: string }>;
}

export interface CompanyUsageResponse {
  totalRequests: number;
  since: string;
  until: string;
  perShop: Array<{ shopId: number; shopName: string; shopSlug: string; requestCount: number }>;
  timeSeries: Array<{ date: string; requestCount: number }>;
  byClientContext: Array<{ clientContext: string; requestCount: number }>;
  topEndpoints: Array<{ endpointTag: string; method: string; requestCount: number }>;
}

export interface CompanyUsageAlert {
  id: number;
  shopId: number;
  shopName: string | null;
  shopSlug: string | null;
  triggeredAt: string;
  periodStart: string;
  periodEnd: string;
  requestCount: number;
  baselineCount: number;
  reason: string;
  resolvedAt: string | null;
}

export interface AdsUsageResponse {
  since: string;
  uploads: {
    totalCount: number;
    totalBytes: number;
    imageCount: number;
    imageBytes: number;
    videoCount: number;
    videoBytes: number;
    lastSeenAt: string | null;
  };
  adMedia: {
    requests: number;
    redirects: number;
    estimatedBytes: number;
    lastSeenAt: string | null;
  };
  topAds: Array<{
    adId: number;
    companyId: number | null;
    requests: number;
    redirects: number;
    estimatedBytes: number;
    lastSeenAt: string;
  }>;
  uploadTrend: Array<{
    hour: string;
    uploads: number;
    totalBytes: number;
    imageBytes: number;
    videoBytes: number;
  }>;
  adMediaEndpoint: {
    endpoint: string;
    requests: number;
    bytes: number;
    status304: number;
  } | null;
}

export interface AdOrder {
  id: number;
  companyId: number;
  advertiserName: string;
  advertiserEmail: string;
  advertiserPhone: string | null;
  durationSeconds: number;
  shopIds: number[];
  imageStorageKey: string | null;
  imagePublicUrl: string | null;
  imageMimeType: string | null;
  imageBytes: number | null;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: number | null;
}

export function createCompaniesApi(client: BaseApiClient): CompaniesApi {
  const c = client as any;
  const baseUrl = c.baseUrl as string;
  return {
    getCompanyDashboard: (companyId) => c.get(`/companies/${companyId}/dashboard`),
    getCompanyShops: (companyId) => c.get(`/companies/${companyId}/shops`),
    createCompanyShop: (companyId, data) => c.post(`/companies/${companyId}/shops`, data),
    async uploadShopHomeImage(companyId, shopId, file) {
      const formData = new FormData();
      formData.append('file', file);
      const token = c.authToken;
      const res = await fetch(`${baseUrl}/companies/${companyId}/shops/${shopId}/home-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${res.statusText}`);
      }
      return res.json();
    },
    async uploadDraftHomeImage(companyId, file) {
      const formData = new FormData();
      formData.append('file', file);
      const token = c.authToken;
      const res = await fetch(`${baseUrl}/companies/${companyId}/uploads/home-about`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${res.statusText}`);
      }
      return res.json();
    },
    createFullShop: (companyId, data) => c.post(`/companies/${companyId}/shops/full`, data),
    updateCompanyShop: (companyId, shopId, data) => c.patch(`/companies/${companyId}/shops/${shopId}`, data),
    deleteCompanyShop: (companyId, shopId) => c.del(`/companies/${companyId}/shops/${shopId}`),
    updateCompanyShopBarber: (companyId, shopId, barberId, data) =>
      c.patch(`/companies/${companyId}/shops/${shopId}/barbers/${barberId}`, data),
    lookupPlacesByAddress: (companyId, address) =>
      c.get(`/companies/${companyId}/places-lookup?address=${encodeURIComponent(address)}`),
    getAdOrders: (companyId, status) => {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return c.get(`/companies/${companyId}/ad-orders${q}`);
    },
    patchAdOrder: (companyId, orderId, body) =>
      c.patch(`/companies/${companyId}/ad-orders/${orderId}`, body),
    getAdPricing: (companyId) => c.get(`/companies/${companyId}/ad-pricing`),
    putAdPricing: (companyId, pricing) => c.put(`/companies/${companyId}/ad-pricing`, pricing),
    getCompany: (companyId) => c.get(`/companies/${companyId}`),
    patchCompany: (companyId, data) => c.patch(`/companies/${companyId}`, data),
    getCompanyUsage: (companyId, params) => {
      const q = params?.days != null ? `?days=${params.days}` : '';
      return c.get(`/companies/${companyId}/usage${q}`);
    },
    getAdsUsage: () => c.get('/usage/ads'),
    getCompanyUsageAlerts: (companyId, params) => {
      const q = params?.resolved != null ? `?resolved=${params.resolved}` : '';
      return c.get(`/companies/${companyId}/usage/alerts${q}`);
    },
    resolveUsageAlert: (companyId, alertId) =>
      c.patch(`/companies/${companyId}/usage/alerts/${alertId}`, {}),
  };
}
