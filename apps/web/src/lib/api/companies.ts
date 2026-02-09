import type { ShopTheme, HomeContent, ShopAdminView, ShopSettings } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface CompaniesApi {
  getCompanyDashboard(companyId: number): Promise<{ totalShops: number; activeAds: number; totalAds: number }>;
  getCompanyShops(companyId: number): Promise<ShopAdminView[]>;
  createCompanyShop(companyId: number, data: { name: string; slug?: string; domain?: string; path?: string; apiBase?: string }): Promise<ShopAdminView>;
  createFullShop(companyId: number, data: {
    name: string; slug?: string; domain?: string; theme?: Partial<ShopTheme>; homeContent?: Partial<HomeContent>;
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
    theme?: Partial<ShopTheme>; homeContent?: Partial<HomeContent>; settings?: Partial<ShopSettings>;
  }): Promise<ShopAdminView>;
  deleteCompanyShop(companyId: number, shopId: number): Promise<{ success: boolean; message: string }>;
}

export function createCompaniesApi(client: BaseApiClient): CompaniesApi {
  const c = client as any;
  return {
    getCompanyDashboard: (companyId) => c.get(`/companies/${companyId}/dashboard`),
    getCompanyShops: (companyId) => c.get(`/companies/${companyId}/shops`),
    createCompanyShop: (companyId, data) => c.post(`/companies/${companyId}/shops`, data),
    createFullShop: (companyId, data) => c.post(`/companies/${companyId}/shops/full`, data),
    updateCompanyShop: (companyId, shopId, data) => c.patch(`/companies/${companyId}/shops/${shopId}`, data),
    deleteCompanyShop: (companyId, shopId) => c.del(`/companies/${companyId}/shops/${shopId}`),
  };
}
