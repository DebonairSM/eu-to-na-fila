import type { BaseApiClient } from './client.js';

export interface ClientRememberResponse {
  hasClient: boolean;
  name?: string;
}

/** Client list item (search results and update response). */
export interface ClientListItem {
  id: number;
  shopId: number;
  phone: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Client list item for analytics Clients tab (paginated, with ticket count). */
export interface ClientAnalyticsItem {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  ticketCount: number;
}

export interface ClientListResponse {
  clients: ClientAnalyticsItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ClientClipNote {
  id: number;
  clientId: number;
  barberId: number;
  note: string;
  createdAt: string;
  barber?: { name: string };
}

export interface ClientDetailResponse {
  client: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
    state?: string | null;
    city?: string | null;
    dateOfBirth?: string | null;
    gender?: string | null;
    nextServiceNote?: string | null;
    nextServiceImageUrl?: string | null;
  };
  clipNotes: ClientClipNote[];
  serviceHistory: Array<{ id: number; serviceName: string; barberName: string | null; completedAt: string | null }>;
}

export interface ClientSearchResponse {
  clients: ClientListItem[];
}

export interface ClientUpdatePayload {
  name?: string;
  email?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export interface ClientsApi {
  getClientRemember(shopSlug: string, phone: string): Promise<ClientRememberResponse>;
  searchClients(shopSlug: string, q: string): Promise<ClientSearchResponse>;
  listClients(shopSlug: string, page?: number, limit?: number): Promise<ClientListResponse>;
  getClient(shopSlug: string, clientId: number): Promise<ClientDetailResponse>;
  updateClient(shopSlug: string, clientId: number, data: ClientUpdatePayload): Promise<ClientListItem>;
  addClipNote(shopSlug: string, clientId: number, note: string): Promise<ClientClipNote>;
}

export function createClientsApi(client: BaseApiClient): ClientsApi {
  const c = client as any;
  return {
    async getClientRemember(shopSlug, phone) {
      return c.get(
        `/shops/${shopSlug}/clients/remember?phone=${encodeURIComponent(phone)}`
      );
    },
    async searchClients(shopSlug, q) {
      const query = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
      return c.get(`/shops/${shopSlug}/clients${query}`);
    },
    async listClients(shopSlug, page = 1, limit = 50) {
      return c.get(`/shops/${shopSlug}/clients/list?page=${page}&limit=${limit}`);
    },
    async getClient(shopSlug, clientId) {
      return c.get(`/shops/${shopSlug}/clients/${clientId}`);
    },
    async updateClient(shopSlug, clientId, data) {
      return c.patch(`/shops/${shopSlug}/clients/${clientId}`, data);
    },
    async addClipNote(shopSlug, clientId, note) {
      return c.post(`/shops/${shopSlug}/clients/${clientId}/clip-notes`, { note });
    },
  };
}
