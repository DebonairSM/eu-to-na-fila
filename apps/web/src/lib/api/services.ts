import type { Service } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface ServicesApi {
  getServices(shopSlug: string): Promise<Service[]>;
  createService(shopSlug: string, data: { name: string; description?: string; duration: number; price?: number; isActive?: boolean }): Promise<Service>;
  updateService(serviceId: number, data: { name?: string; description?: string | null; duration?: number; price?: number | null; isActive?: boolean }): Promise<Service>;
  deleteService(serviceId: number): Promise<{ success: boolean; message: string }>;
}

export function createServicesApi(client: BaseApiClient): ServicesApi {
  const c = client as any;
  return {
    async getServices(shopSlug) {
      const response = await c.get(`/shops/${shopSlug}/services`) as { services?: Service[] } | Service[];
      if (Array.isArray(response)) return response;
      return Array.isArray(response?.services) ? response.services : [];
    },
    createService: (shopSlug, data) => c.post(`/shops/${shopSlug}/services`, data),
    updateService: (serviceId, data) => c.patch(`/services/${serviceId}`, data),
    deleteService: (serviceId) => c.del(`/services/${serviceId}`),
  };
}
