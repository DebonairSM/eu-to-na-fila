import type { Ticket, CreateTicket, UpdateTicketStatus } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';
import { ApiError } from './errors.js';
import { API_TIMEOUT_ACTIVE_TICKET_MS } from '../constants.js';

export interface CreateAppointmentInput {
  serviceId: number;
  customerName: string;
  customerPhone?: string;
  preferredBarberId?: number;
  scheduledTime: string; // ISO
}

export interface BookAppointmentInput {
  /** Primary service (first of list when using complementaryServiceIds). */
  serviceId?: number;
  /** All selected service IDs; first is primary. When present, used for slot duration and stored on ticket. */
  complementaryServiceIds?: number[];
  customerName: string;
  customerPhone?: string;
  preferredBarberId?: number;
  scheduledTime: string; // ISO
  deviceId?: string;
}

export interface SlotsResponse {
  slots: Array<{ time: string; available: boolean }>;
}

export interface TicketsApi {
  getActiveTicketByDevice(shopSlug: string, deviceId: string): Promise<Ticket | null>;
  createTicket(shopSlug: string, data: Omit<CreateTicket, 'shopId'>): Promise<Ticket>;
  createAppointment(shopSlug: string, data: CreateAppointmentInput): Promise<Ticket>;
  getAppointmentSlots(shopSlug: string, date: string, serviceIds: number[], barberId?: number): Promise<SlotsResponse>;
  bookAppointment(shopSlug: string, data: BookAppointmentInput): Promise<Ticket>;
  sendAppointmentReminder(shopSlug: string, ticketId: number, email: string): Promise<{ sent: boolean; error?: string }>;
  checkInAppointment(shopSlug: string, ticketId: number): Promise<Ticket>;
  getTicket(ticketId: number): Promise<Ticket>;
  updateTicketStatus(ticketId: number, data: UpdateTicketStatus): Promise<Ticket>;
  rescheduleAppointment(ticketId: number, scheduledTime: string): Promise<Ticket>;
  cancelTicket(ticketId: number): Promise<Ticket>;
  cancelTicketAsStaff(ticketId: number): Promise<Ticket>;
  updateTicket(ticketId: number, updates: { barberId?: number | null; status?: 'pending' | 'waiting' | 'in_progress' | 'completed' | 'cancelled'; scheduledTime?: string }): Promise<Ticket>;
  deleteAllTickets(shopSlug: string): Promise<{ deletedCount: number }>;
}

export function createTicketsApi(client: BaseApiClient): TicketsApi {
  const c = client as any;
  return {
    async getActiveTicketByDevice(shopSlug, deviceId) {
      try {
        return await c.get(
          `/shops/${shopSlug}/tickets/active?deviceId=${encodeURIComponent(deviceId)}`,
          API_TIMEOUT_ACTIVE_TICKET_MS,
          { disableRetry: true }
        );
      } catch (error) {
        if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 429)) return null;
        throw error;
      }
    },
    createTicket: (shopSlug, data) => c.post(`/shops/${shopSlug}/tickets`, data),
    createAppointment: (shopSlug, data) =>
      c.post(`/shops/${shopSlug}/tickets/appointment`, {
        ...data,
        scheduledTime: data.scheduledTime,
      }),
    getAppointmentSlots: (shopSlug, date, serviceIds, barberId) =>
      c.get(`/shops/${shopSlug}/appointments/slots?date=${encodeURIComponent(date)}&serviceIds=${serviceIds.join(',')}${barberId != null ? '&barberId=' + barberId : ''}`),
    bookAppointment: (shopSlug, data) =>
      c.post(`/shops/${shopSlug}/appointments/book`, data),
    sendAppointmentReminder: (shopSlug, ticketId, email) =>
      c.post(`/shops/${shopSlug}/appointments/${ticketId}/remind`, { email }),
    checkInAppointment: (shopSlug, ticketId) =>
      c.post(`/shops/${shopSlug}/tickets/${ticketId}/check-in`, {}),
    getTicket: (ticketId) => c.get(`/tickets/${ticketId}`),
    updateTicketStatus: (ticketId, data) =>
      c.patch(`/tickets/${ticketId}/status`, data, 45000),
    rescheduleAppointment: (ticketId, scheduledTime) =>
      c.post(`/tickets/${ticketId}/reschedule`, { scheduledTime }, 15000),
    cancelTicket: (ticketId) => c.post(`/tickets/${ticketId}/cancel`, {}, 8000),
    cancelTicketAsStaff: (ticketId) => c.del(`/tickets/${ticketId}`),
    updateTicket: (ticketId, updates) => c.patch(`/tickets/${ticketId}`, updates),
    deleteAllTickets: (shopSlug) => c.del(`/shops/${shopSlug}/tickets`),
  };
}
