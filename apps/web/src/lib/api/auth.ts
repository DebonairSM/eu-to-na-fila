import type { BaseApiClient } from './client.js';

export interface CustomerProfile {
  name: string;
  email: string | null;
  phone: string | null;
  preferences: { emailReminders: boolean };
  nextServiceNote: string | null;
  nextServiceImageUrl: string | null;
  address: string | null;
  state: string | null;
  city: string | null;
  dateOfBirth: string | null;
  gender: string | null;
}

export interface CustomerAppointment {
  id: number;
  status: string;
  type: string;
  customerName: string;
  serviceName: string | null;
  barberName: string | null;
  scheduledTime: string | null;
  position?: number;
  estimatedWaitTime?: number | null;
  ticketNumber: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface CustomerAppointmentsResponse {
  upcoming: CustomerAppointment[];
  past: CustomerAppointment[];
}

export interface AuthApi {
  authenticate(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }>;
  authenticateBarber(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'barber' | null; token?: string; barberId?: number; barberName?: string }>;
  authenticateKiosk(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'kiosk' | null; token?: string }>;
  companyAuthenticate(username: string, password: string): Promise<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }>;
  registerCustomer(shopSlug: string, data: { email: string; password: string; name?: string }): Promise<{ valid: boolean; role: 'customer'; token: string; clientId: number }>;
  loginCustomer(shopSlug: string, data: { email: string; password: string; remember_me?: boolean }): Promise<{ valid: boolean; role: 'customer' | null; token?: string; clientId?: number; name?: string }>;
  getCustomerProfile(shopSlug: string): Promise<CustomerProfile>;
  updateCustomerProfile(shopSlug: string, data: {
    name?: string;
    phone?: string | null;
    preferences?: { emailReminders?: boolean };
    nextServiceNote?: string | null;
    nextServiceImageUrl?: string | null;
    address?: string | null;
    state?: string | null;
    city?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  }): Promise<CustomerProfile>;
  uploadClientReferenceImage(shopSlug: string, file: File): Promise<{ url: string }>;
  getCustomerAppointments(shopSlug: string): Promise<CustomerAppointmentsResponse>;
  getCustomerGoogleAuthUrl(shopSlug: string, redirectUri?: string): string;
}

export function createAuthApi(client: BaseApiClient): AuthApi {
  const c = client as any;
  return {
    async authenticate(shopSlug, username, password) {
      const result = await c.post(`/shops/${shopSlug}/auth`, { username, password }) as { valid: boolean; role: 'owner' | 'staff' | null; token?: string };
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
    async updateCustomerProfile(shopSlug, data) {
      return c.patch(`/shops/${shopSlug}/auth/customer/me`, data) as Promise<CustomerProfile>;
    },
    async uploadClientReferenceImage(shopSlug, file) {
      const formData = new FormData();
      formData.append('file', file);
      const baseUrl = client.getBaseUrl();
      const token = (client as unknown as { authToken?: string }).authToken;
      const res = await fetch(`${baseUrl}/shops/${encodeURIComponent(shopSlug)}/auth/customer/me/reference/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Upload failed: ${res.statusText}`);
      }
      return res.json() as Promise<{ url: string }>;
    },
    async getCustomerAppointments(shopSlug) {
      return c.get(`/shops/${shopSlug}/auth/customer/me/appointments`) as Promise<CustomerAppointmentsResponse>;
    },
    getCustomerGoogleAuthUrl(shopSlug, redirectUri) {
      const base = client.getBaseUrl();
      const path = `/shops/${encodeURIComponent(shopSlug)}/auth/customer/google`;
      const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
      return `${base}${path}${query}`;
    },
  };
}
