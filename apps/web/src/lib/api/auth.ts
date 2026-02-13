import type { BaseApiClient } from './client.js';

export interface CustomerProfile {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AuthApi {
  authenticate(shopSlug: string, password: string): Promise<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }>;
  authenticateBarber(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'barber' | null; token?: string; barberId?: number; barberName?: string }>;
  authenticateKiosk(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'kiosk' | null; token?: string }>;
  companyAuthenticate(username: string, password: string): Promise<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }>;
  registerCustomer(shopSlug: string, data: { email: string; password: string; name?: string }): Promise<{ valid: boolean; role: 'customer'; token: string; clientId: number }>;
  loginCustomer(shopSlug: string, data: { email: string; password: string }): Promise<{ valid: boolean; role: 'customer' | null; token?: string; clientId?: number }>;
  getCustomerProfile(shopSlug: string): Promise<CustomerProfile>;
  getCustomerGoogleAuthUrl(shopSlug: string, redirectUri?: string): string;
}

export function createAuthApi(client: BaseApiClient): AuthApi {
  const c = client as any;
  return {
    async authenticate(shopSlug, password) {
      const result = await c.post(`/shops/${shopSlug}/auth`, { password }) as { valid: boolean; role: 'owner' | 'staff' | null; token?: string };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async authenticateBarber(shopSlug, username, password) {
      const result = await c.post(`/shops/${shopSlug}/auth/barber`, { username, password }) as { valid: boolean; role: 'barber' | null; token?: string; barberId?: number; barberName?: string };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async authenticateKiosk(shopSlug, username, password) {
      const result = await c.post(`/shops/${shopSlug}/auth/kiosk`, { username, password }) as { valid: boolean; role: 'kiosk' | null; token?: string };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async companyAuthenticate(username, password) {
      const result = await c.post('/company/auth', { username, password }) as { valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async registerCustomer(shopSlug, data) {
      const result = await c.post(`/shops/${shopSlug}/auth/customer/register`, data) as { valid: boolean; role: 'customer'; token: string; clientId: number };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async loginCustomer(shopSlug, data) {
      const result = await c.post(`/shops/${shopSlug}/auth/customer/login`, data) as { valid: boolean; role: 'customer' | null; token?: string; clientId?: number };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async getCustomerProfile(shopSlug) {
      return c.get(`/shops/${shopSlug}/auth/customer/me`) as Promise<CustomerProfile>;
    },
    getCustomerGoogleAuthUrl(shopSlug, redirectUri) {
      const base = client.getBaseUrl();
      const path = `/shops/${encodeURIComponent(shopSlug)}/auth/customer/google`;
      const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
      return `${base}${path}${query}`;
    },
  };
}
