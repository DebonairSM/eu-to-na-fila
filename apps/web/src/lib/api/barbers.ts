import type { Barber } from '@eutonafila/shared';
import type { BaseApiClient } from './client.js';

export interface BarbersApi {
  getBarbers(shopSlug: string): Promise<Barber[]>;
  toggleBarberPresence(barberId: number, isPresent: boolean): Promise<Barber>;
  createBarber(shopSlug: string, data: { name: string; avatarUrl?: string | null; username?: string; password?: string }): Promise<Barber>;
  updateBarber(barberId: number, data: { name?: string; avatarUrl?: string | null; username?: string | null; password?: string; revenueSharePercent?: number | null }): Promise<Barber>;
  setBarberPassword(shopSlug: string, barberId: number, password: string): Promise<{ success: boolean; message: string }>;
  deleteBarber(barberId: number): Promise<{ success: boolean; message: string }>;
}

export function createBarbersApi(client: BaseApiClient): BarbersApi {
  const c = client as any;
  return {
    getBarbers: (shopSlug) => c.get(`/shops/${shopSlug}/barbers`),
    toggleBarberPresence: (barberId, isPresent) => c.patch(`/barbers/${barberId}/presence`, { isPresent }),
    createBarber: (shopSlug, data) => c.post(`/shops/${shopSlug}/barbers`, data),
    updateBarber: (barberId, data) => c.patch(`/barbers/${barberId}`, data),
    setBarberPassword: (shopSlug, barberId, password) => c.post(`/shops/${shopSlug}/barbers/${barberId}/set-password`, { password }),
    deleteBarber: (barberId) => c.del(`/barbers/${barberId}`),
  };
}
