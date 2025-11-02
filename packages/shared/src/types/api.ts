import type { Ticket, TicketStatus } from '../schemas/ticket.js';
import type { Shop } from '../schemas/shop.js';
import type { Service } from '../schemas/service.js';
import type { Barber } from '../schemas/barber.js';

// Error response types are defined in types/errors.ts
// Import and re-export if needed in API context
import type { ErrorResponse, ValidationErrorResponse } from './errors.js';

export type { ErrorResponse as ApiErrorResponse, ValidationErrorResponse };

/**
 * GET /health
 */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
}

/**
 * GET /api/shops/:slug/queue
 */
export interface GetQueueRequest {
  slug: string; // path param
}

export interface GetQueueResponse {
  shop: Shop;
  tickets: Ticket[];
}

/**
 * POST /api/shops/:slug/tickets
 */
export interface CreateTicketRequest {
  slug: string; // path param
  body: {
    serviceId: number;
    customerName: string;
    customerPhone?: string;
  };
}

export interface CreateTicketResponse extends Ticket {}

/**
 * GET /api/tickets/:id
 */
export interface GetTicketRequest {
  id: number; // path param
}

export interface GetTicketResponse extends Ticket {}

/**
 * PATCH /api/tickets/:id/status
 */
export interface UpdateTicketStatusRequest {
  id: number; // path param
  body: {
    status: TicketStatus;
    barberId?: number;
  };
}

export interface UpdateTicketStatusResponse extends Ticket {}

/**
 * GET /api/shops/:slug/services
 */
export interface GetServicesRequest {
  slug: string; // path param
}

export interface GetServicesResponse {
  services: Service[];
}

/**
 * GET /api/shops/:slug/barbers
 */
export interface GetBarbersRequest {
  slug: string; // path param
}

export interface GetBarbersResponse {
  barbers: Barber[];
}

/**
 * GET /api/shops/:slug/statistics
 */
export interface GetStatisticsRequest {
  slug: string; // path param
  since?: string; // query param (ISO date string)
}

export interface GetStatisticsResponse {
  total: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  averageWaitTime: number;
  averageServiceTime: number;
}

/**
 * GET /api/shops/:slug/metrics
 */
export interface GetMetricsRequest {
  slug: string; // path param
}

export interface GetMetricsResponse {
  queueLength: number;
  averageWaitTime: number;
  activeBarbers: number;
  ticketsInProgress: number;
}

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Common query filters for tickets.
 */
export interface TicketFilters {
  status?: TicketStatus;
  barberId?: number;
  serviceId?: number;
  startDate?: string;
  endDate?: string;
}

