import type { BaseApiClient } from './client.js';
import type { ReferencePresetId } from '@eutonafila/shared';

export interface CustomerProfile {
  name: string;
  email: string | null;
  phone: string | null;
  preferences: { emailReminders: boolean };
  nextServiceNote: string | null;
  nextServiceImageUrl: string | null;
  nextServicePreset: ReferencePresetId | null;
  address: string | null;
  state: string | null;
  city: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  /** Completed visits at this shop (for "You've been here X times" and regular badge). */
  visitCount?: number;
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
  /** Set for past appointments from other shops (cross-shop history). */
  shopSlug?: string;
  shopName?: string;
}

export interface CustomerAppointmentsResponse {
  upcoming: CustomerAppointment[];
  past: CustomerAppointment[];
}

export type StaffAuthRole = 'owner' | 'staff' | 'barber' | 'kiosk';

export interface AuthApi {
  authenticate(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }>;
  authenticateBarber(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'barber' | null; token?: string; barberId?: number; barberName?: string }>;
  authenticateKiosk(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: 'kiosk' | null; token?: string }>;
  /** Unified staff login: identifies owner/staff/barber/kiosk from credentials. */
  authenticateStaff(shopSlug: string, username: string, password: string): Promise<{ valid: boolean; role: StaffAuthRole | null; token?: string; barberId?: number; barberName?: string; pinResetRequired?: boolean }>;
  /** Unified login: identifier (email or username) + password. Returns role: customer | owner | staff | barber | kiosk. */
  login(shopSlug: string, data: { identifier: string; password: string; remember_me?: boolean }): Promise<{
    valid: boolean;
    role: 'customer' | 'owner' | 'staff' | 'barber' | 'kiosk' | null;
    token?: string;
    clientId?: number;
    name?: string;
    barberId?: number;
    barberName?: string;
    pinResetRequired?: boolean;
  }>;
  companyAuthenticate(username: string, password: string): Promise<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }>;
  registerCustomer(shopSlug: string, data: { email: string; password: string; name?: string; dateOfBirth?: string | null }): Promise<{ valid: boolean; role: 'customer'; token: string; clientId: number }>;
  loginCustomer(shopSlug: string, data: { email: string; password: string; remember_me?: boolean }): Promise<{ valid: boolean; role: 'customer' | null; token?: string; clientId?: number; name?: string }>;
  getCustomerProfile(shopSlug: string): Promise<CustomerProfile>;
  updateCustomerProfile(shopSlug: string, data: {
    name?: string;
    phone?: string | null;
    preferences?: { emailReminders?: boolean };
    nextServiceNote?: string | null;
    nextServiceImageUrl?: string | null;
    nextServicePreset?: ReferencePresetId | null;
    address?: string | null;
    state?: string | null;
    city?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
  }): Promise<CustomerProfile>;
  getPopularReferencePresets(shopSlug: string): Promise<{ presets: Array<{ preset: ReferencePresetId; count: number }> }>;
  uploadClientReferenceImage(shopSlug: string, file: File): Promise<{ url: string }>;
  getCustomerAppointments(shopSlug: string): Promise<CustomerAppointmentsResponse>;
  getBestTimes(shopSlug: string): Promise<{ suggestion: string | null }>;
  getCustomerGoogleAuthUrl(shopSlug: string, redirectUri?: string): string;
  requestPasswordReset(shopSlug: string, email: string): Promise<{ message: string }>;
  resetPassword(shopSlug: string, data: { token: string; newPassword: string }): Promise<{ message: string }>;
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
    async authenticateStaff(shopSlug, username, password) {
      const result = await c.post(`/shops/${shopSlug}/auth/staff`, { username, password }) as { valid: boolean; role: StaffAuthRole | null; token?: string; barberId?: number; barberName?: string; pinResetRequired?: boolean };
      if (result.valid && result.token) client.setAuthToken(result.token);
      return result;
    },
    async login(shopSlug, data) {
      const result = await c.post(`/shops/${shopSlug}/auth/login`, data) as {
        valid: boolean;
        role: 'customer' | 'owner' | 'staff' | 'barber' | 'kiosk' | null;
        token?: string;
        clientId?: number;
        name?: string;
        barberId?: number;
        barberName?: string;
        pinResetRequired?: boolean;
      };
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
    async getBestTimes(shopSlug) {
      return c.get(`/shops/${shopSlug}/auth/customer/best-times`) as Promise<{ suggestion: string | null }>;
    },
    async getPopularReferencePresets(shopSlug) {
      return c.get(`/shops/${shopSlug}/auth/customer/me/popular-reference-presets`) as Promise<{ presets: Array<{ preset: ReferencePresetId; count: number }> }>;
    },
    getCustomerGoogleAuthUrl(shopSlug, redirectUri) {
      const base = client.getBaseUrl();
      const path = `/shops/${encodeURIComponent(shopSlug)}/auth/customer/google`;
      const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
      return `${base}${path}${query}`;
    },
    async requestPasswordReset(shopSlug, email) {
      return c.post(`/shops/${shopSlug}/auth/forgot-password`, { email }) as Promise<{ message: string }>;
    },
    async resetPassword(shopSlug, data) {
      return c.post(`/shops/${shopSlug}/auth/reset-password`, data) as Promise<{ message: string }>;
    },
  };
}
