/**
 * Composed API client.
 *
 * Import path remains `import { api } from '@/lib/api'` (or '@/lib/api/index').
 * Internally each domain (queue, tickets, barbers, etc.) is a separate module
 * for SRP. The composed object exposes the same flat method surface so no
 * consumers need to change.
 */
import { config } from '../config';
import { BaseApiClient } from './client';
import { ApiError } from './errors';
import { createQueueApi } from './queue';
import { createTicketsApi } from './tickets';
import { createBarbersApi } from './barbers';
import { createServicesApi } from './services';
import { createShopsApi } from './shops';
import { createCompaniesApi } from './companies';
import { createAuthApi } from './auth';
import { createAdsApi } from './ads';
import { createAnalyticsApi } from './analytics';

export type { ShopTheme, HomeContent, ShopPublicConfig, ShopListItem, ShopAdminView } from '@eutonafila/shared';
export type { PlacesLookupResult, PlacesLookupLocation } from './companies';
export { ApiError };

class ApiClient extends BaseApiClient {
  // Domain APIs composed in
  private _queue = createQueueApi(this);
  private _tickets = createTicketsApi(this);
  private _barbers = createBarbersApi(this);
  private _services = createServicesApi(this);
  private _shops = createShopsApi(this);
  private _companies = createCompaniesApi(this);
  private _auth = createAuthApi(this);
  private _ads = createAdsApi(this);
  private _analytics = createAnalyticsApi(this);

  // --- Queue ---
  getQueue = this._queue.getQueue;
  getQueueNext = this._queue.getQueueNext;
  getMetrics = this._queue.getMetrics;
  getWaitDebug = this._queue.getWaitDebug;
  getWaitTimes = this._queue.getWaitTimes;
  getStatistics = this._queue.getStatistics;
  recalculate = this._queue.recalculate;

  // --- Tickets ---
  getActiveTicketByDevice = this._tickets.getActiveTicketByDevice;
  createTicket = this._tickets.createTicket;
  createAppointment = this._tickets.createAppointment;
  getAppointmentSlots = this._tickets.getAppointmentSlots;
  bookAppointment = this._tickets.bookAppointment;
  sendAppointmentReminder = this._tickets.sendAppointmentReminder;
  checkInAppointment = this._tickets.checkInAppointment;
  getTicket = this._tickets.getTicket;
  updateTicketStatus = this._tickets.updateTicketStatus;
  cancelTicket = this._tickets.cancelTicket;
  cancelTicketAsStaff = this._tickets.cancelTicketAsStaff;
  updateTicket = this._tickets.updateTicket;

  // --- Barbers ---
  getBarbers = this._barbers.getBarbers;
  toggleBarberPresence = this._barbers.toggleBarberPresence;
  createBarber = this._barbers.createBarber;
  updateBarber = this._barbers.updateBarber;
  setBarberPassword = this._barbers.setBarberPassword;
  deleteBarber = this._barbers.deleteBarber;

  // --- Services ---
  getServices = this._services.getServices;
  createService = this._services.createService;
  updateService = this._services.updateService;
  deleteService = this._services.deleteService;

  // --- Shops ---
  getShopConfig = this._shops.getShopConfig;
  getAllShops = this._shops.getAllShops;
  getProjects = this._shops.getProjects;
  setTemporaryStatus = this._shops.setTemporaryStatus;
  clearTemporaryStatus = this._shops.clearTemporaryStatus;

  // --- Companies ---
  getCompanyDashboard = this._companies.getCompanyDashboard;
  getCompanyShops = this._companies.getCompanyShops;
  createCompanyShop = this._companies.createCompanyShop;
  uploadShopHomeImage = this._companies.uploadShopHomeImage;
  uploadDraftHomeImage = this._companies.uploadDraftHomeImage;
  createFullShop = this._companies.createFullShop;
  updateCompanyShop = this._companies.updateCompanyShop;
  deleteCompanyShop = this._companies.deleteCompanyShop;
  updateCompanyShopBarber = this._companies.updateCompanyShopBarber;
  lookupPlacesByAddress = this._companies.lookupPlacesByAddress;

  // --- Auth ---
  authenticate = this._auth.authenticate;
  authenticateBarber = this._auth.authenticateBarber;
  authenticateKiosk = this._auth.authenticateKiosk;
  companyAuthenticate = this._auth.companyAuthenticate;

  // --- Ads ---
  uploadAd = this._ads.uploadAd;
  getAdsManifest = this._ads.getAdsManifest;
  getAds = this._ads.getAds;
  updateAd = this._ads.updateAd;
  deleteAd = this._ads.deleteAd;

  // --- Analytics ---
  getAnalytics = this._analytics.getAnalytics;
  getBarberAnalytics = this._analytics.getBarberAnalytics;

  // --- WebSocket ---
  getWebSocketUrl(): string | null {
    const baseUrl = this.baseUrl;
    if (!baseUrl) return null;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      try {
        const url = new URL(baseUrl);
        return `${wsProtocol}//${url.host}/ws`;
      } catch {
        return `${wsProtocol}//${host}/ws`;
      }
    }
    return `${wsProtocol}//${host}/ws`;
  }
}

/** Singleton API client instance. */
export const api = new ApiClient(config.apiBase);

/** Create a new API client with custom base URL. */
export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl);
}
