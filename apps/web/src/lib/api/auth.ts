import type { BaseApiClient } from './client.js';

export interface AuthApi {
  authenticate(shopSlug: string, password: string): Promise<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }>;
  authenticateBarber(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'barber' | null; token?: string; barberId?: number; barberName?: string }>;
  authenticateKiosk(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'kiosk' | null; token?: string }>;
  companyAuthenticate(username: string, password: string): Promise<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }>;
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
  };
}
