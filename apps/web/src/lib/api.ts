import { config } from './config';
import type {
  Ticket,
  CreateTicket,
  UpdateTicketStatus,
  Service,
  Barber,
  ApiErrorResponse,
  GetQueueResponse,
  GetMetricsResponse,
  GetStatisticsResponse,
} from '@eutonafila/shared';

/**
 * API client error.
 * Wraps server error responses with additional context.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Check if error is a validation error.
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  /**
   * Check if error is a not found error.
   */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Get field-specific errors for form display.
   */
  getFieldErrors(): Record<string, string> {
    if (!this.errors) return {};

    return this.errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {} as Record<string, string>);
  }
}

/**
 * Type-safe API client for the queue management system.
 * 
 * Handles:
 * - HTTP requests with proper typing
 * - Error handling and transformation
 * - Authentication (future)
 * - Request/response validation
 * 
 * @example
 * ```typescript
 * import { api } from './lib/api';
 * 
 * // Get queue
 * const { shop, tickets } = await api.getQueue('mineiro');
 * 
 * // Create ticket
 * const ticket = await api.createTicket('mineiro', {
 *   serviceId: 2,
 *   customerName: 'João Silva',
 *   customerPhone: '11999999999'
 * });
 * ```
 */
class ApiClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set authentication token for future requests.
   * 
   * @param token - JWT token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token.
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Make an HTTP request.
   * 
   * @param path - API path (e.g., '/shops/mineiro/queue')
   * @param options - Fetch options
   * @returns Parsed response data
   * @throws {ApiError} If request fails
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Add any custom headers
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Parse response
      const data = await response.json();

      // Check if response is an error
      if (!response.ok) {
        const error = data as ApiErrorResponse;
        throw new ApiError(
          error.error,
          error.statusCode,
          error.code,
          'errors' in error ? (error as any).errors : undefined
        );
      }

      return data as T;
    } catch (error) {
      // Re-throw ApiError as is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap network errors
      if (error instanceof TypeError) {
        throw new ApiError(
          'Network error - please check your connection',
          0,
          'NETWORK_ERROR'
        );
      }

      // Wrap unknown errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'UNKNOWN_ERROR'
      );
    }
  }

  /**
   * GET request helper.
   */
  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  /**
   * POST request helper.
   */
  private async post<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request helper.
   */
  private async patch<T>(path: string, body: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request helper.
   */
  private async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // ==================== Queue Endpoints ====================

  /**
   * Get current queue for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @returns Shop details and all tickets
   * @throws {ApiError} If shop not found
   * 
   * @example
   * ```typescript
   * const { shop, tickets } = await api.getQueue('mineiro');
   * console.log(`${tickets.length} tickets in queue`);
   * ```
   */
  async getQueue(shopSlug: string): Promise<GetQueueResponse> {
    return this.get(`/shops/${shopSlug}/queue`);
  }

  /**
   * Get queue metrics for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @returns Queue metrics
   * 
   * @example
   * ```typescript
   * const metrics = await api.getMetrics('mineiro');
   * console.log(`${metrics.queueLength} people waiting`);
   * ```
   */
  async getMetrics(shopSlug: string): Promise<GetMetricsResponse> {
    return this.get(`/shops/${shopSlug}/metrics`);
  }

  /**
   * Get statistics for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @param since - Optional start date
   * @returns Ticket statistics
   */
  async getStatistics(
    shopSlug: string,
    since?: Date
  ): Promise<GetStatisticsResponse> {
    const params = since
      ? `?since=${since.toISOString()}`
      : '';
    return this.get(`/shops/${shopSlug}/statistics${params}`);
  }

  // ==================== Ticket Endpoints ====================

  /**
   * Create a new ticket (join queue).
   * 
   * @param shopSlug - Shop identifier
   * @param data - Ticket data
   * @returns Created ticket with position and wait time
   * @throws {ApiError} If validation fails or queue is full
   * 
   * @example
   * ```typescript
   * try {
   *   const ticket = await api.createTicket('mineiro', {
   *     serviceId: 2,
   *     customerName: 'João Silva',
   *     customerPhone: '11999999999'
   *   });
   *   console.log(`Position in queue: ${ticket.position}`);
   * } catch (error) {
   *   if (error instanceof ApiError && error.isValidationError()) {
   *     console.log('Validation errors:', error.getFieldErrors());
   *   }
   * }
   * ```
   */
  async createTicket(
    shopSlug: string,
    data: Omit<CreateTicket, 'shopId'>
  ): Promise<Ticket> {
    return this.post(`/shops/${shopSlug}/tickets`, data);
  }

  /**
   * Get a ticket by ID.
   * 
   * @param ticketId - Ticket ID
   * @returns Ticket details
   * @throws {ApiError} If ticket not found
   */
  async getTicket(ticketId: number): Promise<Ticket> {
    return this.get(`/tickets/${ticketId}`);
  }

  /**
   * Update a ticket's status.
   * 
   * @param ticketId - Ticket ID
   * @param data - Status update data
   * @returns Updated ticket
   * @throws {ApiError} If invalid status transition
   * 
   * @example
   * ```typescript
   * // Start service
   * const ticket = await api.updateTicketStatus(42, {
   *   status: 'in_progress',
   *   barberId: 3
   * });
   * 
   * // Complete service
   * await api.updateTicketStatus(42, {
   *   status: 'completed'
   * });
   * ```
   */
  async updateTicketStatus(
    ticketId: number,
    data: UpdateTicketStatus
  ): Promise<Ticket> {
    return this.patch(`/tickets/${ticketId}/status`, data);
  }

  /**
   * Cancel a ticket.
   * 
   * @param ticketId - Ticket ID
   * @returns Cancelled ticket
   */
  async cancelTicket(ticketId: number): Promise<Ticket> {
    return this.delete(`/tickets/${ticketId}`);
  }

  // ==================== Future Endpoints ====================

  /**
   * Get all services for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @returns List of services
   */
  async getServices(shopSlug: string): Promise<Service[]> {
    const response = await this.get<{ services: Service[] }>(
      `/shops/${shopSlug}/services`
    );
    return response.services;
  }

  /**
   * Get all barbers for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @returns List of barbers
   */
  async getBarbers(shopSlug: string): Promise<Barber[]> {
    const response = await this.get<{ barbers: Barber[] }>(
      `/shops/${shopSlug}/barbers`
    );
    return response.barbers;
  }
}

/**
 * Singleton API client instance.
 * Pre-configured with base URL from config.
 * 
 * @example
 * ```typescript
 * import { api } from './lib/api';
 * 
 * const queue = await api.getQueue('mineiro');
 * ```
 */
export const api = new ApiClient(config.apiBase);

/**
 * Create a new API client with custom base URL.
 * Useful for testing or multi-tenant scenarios.
 * 
 * @param baseUrl - API base URL
 * @returns New API client instance
 */
export function createApiClient(baseUrl: string): ApiClient {
  return new ApiClient(baseUrl);
}

