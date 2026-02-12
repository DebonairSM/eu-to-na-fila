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

export interface ClientClipNote {
  id: number;
  clientId: number;
  barberId: number;
  note: string;
  createdAt: string;
  barber?: { name: string };
}

export interface ClientDetailResponse {
  client: { id: number; name: string; phone: string; email?: string | null };
  clipNotes: ClientClipNote[];
  serviceHistory: Array<{ id: number; serviceName: string; barberName: string | null; completedAt: string | null }>;
}

export interface ClientSearchResponse {
  clients: ClientListItem[];
}

export interface ClientUpdatePayload {
  name?: string;
  email?: string | null;
}

export interface ClientsApi {
  getClientRemember(shopSlug: string, phone: string): Promise<ClientRememberResponse>;
  searchClients(shopSlug: string, q: string): Promise<ClientSearchResponse>;
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
