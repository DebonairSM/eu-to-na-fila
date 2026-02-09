import type { Ticket, CreateTicket, UpdateTicketStatus } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';
import { ApiError } from './errors.js';

export interface TicketsApi {
  getActiveTicketByDevice(shopSlug: string, deviceId: string): Promise<Ticket | null>;
  createTicket(shopSlug: string, data: Omit<CreateTicket, 'shopId'>): Promise<Ticket>;
  getTicket(ticketId: number): Promise<Ticket>;
  updateTicketStatus(ticketId: number, data: UpdateTicketStatus): Promise<Ticket>;
  cancelTicket(ticketId: number): Promise<Ticket>;
  cancelTicketAsStaff(ticketId: number): Promise<Ticket>;
  updateTicket(ticketId: number, updates: { barberId?: number | null; status?: 'waiting' | 'in_progress' | 'completed' | 'cancelled' }): Promise<Ticket>;
}

export function createTicketsApi(client: BaseApiClient): TicketsApi {
  const c = client as any;
  return {
    async getActiveTicketByDevice(shopSlug, deviceId) {
      try {
        return await c.get(`/shops/${shopSlug}/tickets/active?deviceId=${encodeURIComponent(deviceId)}`);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) return null;
        throw error;
      }
    },
    createTicket: (shopSlug, data) => c.post(`/shops/${shopSlug}/tickets`, data),
    getTicket: (ticketId) => c.get(`/tickets/${ticketId}`),
    updateTicketStatus: (ticketId, data) =>
      c.patch(`/tickets/${ticketId}/status`, data, 45000),
    cancelTicket: (ticketId) => c.post(`/tickets/${ticketId}/cancel`, {}),
    cancelTicketAsStaff: (ticketId) => c.del(`/tickets/${ticketId}`),
    updateTicket: (ticketId, updates) => c.patch(`/tickets/${ticketId}`, updates),
  };
}
