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
    name: string; slug?: string; domain?: string; theme?: Partial<ShopTheme>; homeContent?: Partial<HomeContent>;
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
    ownerPassword?: string; staffPassword?: string;
  }): Promise<ShopAdminView>;
  deleteCompanyShop(companyId: number, shopId: number): Promise<{ success: boolean; message: string }>;
  updateCompanyShopBarber(companyId: number, shopId: number, barberId: number, data: { username?: string | null; password?: string }): Promise<{ id: number; name: string; username: string | null }>;
  lookupPlacesByAddress(companyId: number, address: string): Promise<PlacesLookupResult>;
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
  };
}
