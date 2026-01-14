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
   * Check if error is an authentication error (401 Unauthorized).
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.code === 'UNAUTHORIZED';
  }

  /**
   * Check if error is a conflict error (409 Conflict).
   */
  isConflictError(): boolean {
    return this.statusCode === 409 || this.code === 'CONFLICT';
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
  private readonly TOKEN_STORAGE_KEY = 'eutonafila_auth_token';
  private onAuthError?: () => void;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from sessionStorage on initialization
    try {
      const storedToken = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (storedToken) {
        this.authToken = storedToken;
      }
    } catch (error) {
      // sessionStorage might not be available during module initialization
      // Token will be set later by useAuth hook
      // Silently fail - auth token loading is optional
    }
  }

  /**
   * Set callback to be called when authentication errors occur.
   * 
   * @param callback - Function to call when 401 errors are detected
   */
  setOnAuthError(callback: () => void): void {
    this.onAuthError = callback;
  }

  /**
   * Set authentication token for future requests.
   * 
   * @param token - JWT token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    // Persist token to sessionStorage
    sessionStorage.setItem(this.TOKEN_STORAGE_KEY, token);
  }

  /**
   * Clear authentication token.
   */
  clearAuthToken(): void {
    this.authToken = undefined;
    // Remove token from sessionStorage
    sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
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
    const headers: Record<string, string> = {};

    // Only set Content-Type for methods that typically have bodies
    const method = options.method || 'GET';
    const methodsWithBody = ['POST', 'PATCH', 'PUT'];
    if (methodsWithBody.includes(method)) {
      headers['Content-Type'] = 'application/json';
    }

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

      // Read response as text first (can only read body once)
      const responseText = await response.text();

      // Parse response - handle non-JSON responses (like 502 HTML error pages)
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not JSON (e.g., HTML error page from proxy)
        if (response.status === 502) {
          data = {
            error: 'API server is not reachable. Please ensure the API server is running on port 4041.',
            statusCode: 502,
            code: 'BAD_GATEWAY',
          };
        } else if (response.status >= 500 && response.status < 600) {
          data = {
            error: `Server error (${response.status} ${response.statusText}). The API server may be down or experiencing issues.`,
            statusCode: response.status,
            code: 'SERVER_ERROR',
          };
        } else {
          data = {
            error: `Server returned invalid response (${response.status} ${response.statusText}): ${responseText.substring(0, 100)}`,
            statusCode: response.status,
            code: 'INVALID_RESPONSE',
          };
        }
      }

      // Check if response is an error
      if (!response.ok) {
        const error = data as ApiErrorResponse;
        const apiError = new ApiError(
          error.error,
          error.statusCode,
          error.code,
          'errors' in error && Array.isArray((error as { errors?: unknown }).errors) 
            ? (error as { errors: Array<{ field: string; message: string }> }).errors 
            : undefined
        );

        // If it's an auth error, trigger the callback before throwing
        if (apiError.isAuthError() && this.onAuthError) {
          this.onAuthError();
        }

        throw apiError;
      }

      return data as T;
    } catch (error) {
      // Re-throw ApiError as is
      if (error instanceof ApiError) {
        // If it's an auth error, trigger the callback before throwing
        if (error.isAuthError() && this.onAuthError) {
          this.onAuthError();
        }
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
  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PATCH request helper.
   */
  private async patch<T>(path: string, body: unknown): Promise<T> {
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
   * Get wait-time debug info for a shop.
   *
   * @param shopSlug - Shop identifier
   * @returns Debug info including sampleEstimateForNext
   */
  async getWaitDebug(shopSlug: string): Promise<{
    peopleAhead: number;
    activePresentBarbers: number;
    inProgressRemaining: number;
    sampleEstimateForNext: number;
  }> {
    return this.get(`/shops/${shopSlug}/wait-debug`);
  }

  /**
   * Get wait times for standard queue and all barbers.
   * 
   * @param shopSlug - Shop identifier
   * @returns Wait times for standard queue and each barber
   */
  async getWaitTimes(shopSlug: string): Promise<{
    standardWaitTime: number | null;
    barberWaitTimes: Array<{
      barberId: number;
      barberName: string;
      waitTime: number | null;
      isPresent: boolean;
    }>;
  }> {
    return this.get(`/shops/${shopSlug}/wait-times`);
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
   * If customer already has an active ticket, returns the existing ticket instead.
   * 
   * @param shopSlug - Shop identifier
   * @param data - Ticket data
   * @returns Ticket with position and wait time (may be existing ticket if customer already in queue)
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
   *   // Note: ticket may be an existing ticket if customer already in queue
   * } catch (error) {
   *   if (error instanceof ApiError && error.isValidationError()) {
   *     console.log('Validation errors:', error.getFieldErrors());
   *   }
   * }
   * ```
   */
  /**
   * Get active ticket for a device.
   * 
   * @param shopSlug - Shop slug identifier
   * @param deviceId - Device identifier
   * @returns Active ticket if found
   * @throws {ApiError} If ticket not found or request fails
   * 
   * @example
   * ```typescript
   * const deviceId = getOrCreateDeviceId();
   * const activeTicket = await api.getActiveTicketByDevice('mineiro', deviceId);
   * if (activeTicket) {
   *   // Device already has an active ticket
   * }
   * ```
   */
  async getActiveTicketByDevice(shopSlug: string, deviceId: string): Promise<Ticket | null> {
    try {
      return await this.get(`/shops/${shopSlug}/tickets/active?deviceId=${encodeURIComponent(deviceId)}`);
    } catch (error) {
      // 404 means no active ticket - return null instead of throwing
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

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
   * Cancel a ticket (customer self-service).
   * Public endpoint that allows customers to cancel their own tickets.
   * Only works for tickets with status 'waiting'.
   * 
   * @param ticketId - Ticket ID
   * @returns Cancelled ticket
   * @throws {ApiError} If ticket not found or cannot be cancelled
   */
  async cancelTicket(ticketId: number): Promise<Ticket> {
    return this.post(`/tickets/${ticketId}/cancel`, {});
  }

  /**
   * Cancel a ticket (staff/owner only).
   * Requires authentication. Can cancel tickets in any status.
   * 
   * @param ticketId - Ticket ID
   * @returns Cancelled ticket
   * @throws {ApiError} If not authenticated or ticket not found
   */
  async cancelTicketAsStaff(ticketId: number): Promise<Ticket> {
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
    return this.get<Barber[]>(`/shops/${shopSlug}/barbers`);
  }

  /**
   * Toggle barber presence.
   * When setting isPresent to false, backend automatically unassigns customers.
   * 
   * @param barberId - Barber ID
   * @param isPresent - Whether barber is present
   * @returns Updated barber
   */
  async toggleBarberPresence(barberId: number, isPresent: boolean): Promise<Barber> {
    return this.patch<Barber>(`/barbers/${barberId}/presence`, { isPresent });
  }

  /**
   * Create a new barber for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @param data - Barber data
   * @returns Created barber
   */
  async createBarber(shopSlug: string, data: { name: string; avatarUrl?: string | null }): Promise<Barber> {
    return this.post<Barber>(`/shops/${shopSlug}/barbers`, data);
  }

  /**
   * Update a barber's details.
   * 
   * @param barberId - Barber ID
   * @param data - Update data
   * @returns Updated barber
   */
  async updateBarber(barberId: number, data: { name?: string; avatarUrl?: string | null }): Promise<Barber> {
    return this.patch<Barber>(`/barbers/${barberId}`, data);
  }

  /**
   * Delete a barber.
   * 
   * @param barberId - Barber ID
   * @returns Success message
   */
  async deleteBarber(barberId: number): Promise<{ success: boolean; message: string }> {
    return this.delete(`/barbers/${barberId}`);
  }

  /**
   * Update a ticket (assign barber, change status).
   * 
   * @param ticketId - Ticket ID
   * @param updates - Update data
   * @returns Updated ticket
   */
  async updateTicket(
    ticketId: number,
    updates: { barberId?: number | null; status?: 'waiting' | 'in_progress' | 'completed' | 'cancelled' }
  ): Promise<Ticket> {
    return this.patch<Ticket>(`/tickets/${ticketId}`, updates);
  }

  // ==================== Auth Endpoints ====================

  /**
   * Authenticate with shop PIN.
   * 
   * @param shopSlug - Shop identifier
   * @param pin - PIN code
   * @returns Authentication result with role and token
   */
  async authenticate(shopSlug: string, pin: string): Promise<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }> {
    const result = await this.post<{ valid: boolean; role: 'owner' | 'staff' | null; token?: string }>(`/shops/${shopSlug}/auth`, { pin });
    
    // Store token if authentication was successful
    if (result.valid && result.token) {
      this.setAuthToken(result.token);
    }
    
    return result;
  }

  /**
   * Authenticate as company admin.
   * 
   * @param username - Company admin username
   * @param password - Company admin password
   * @returns Authentication result with role, token, and company ID
   */
  async companyAuthenticate(username: string, password: string): Promise<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }> {
    const result = await this.post<{ valid: boolean; role: 'company_admin' | null; token?: string; companyId?: number; userId?: number }>('/company/auth', { username, password });
    
    // Store token if authentication was successful
    if (result.valid && result.token) {
      this.setAuthToken(result.token);
    }
    
    return result;
  }

  /**
   * Get company dashboard data.
   * 
   * @param companyId - Company ID
   * @returns Dashboard statistics
   */
  async getCompanyDashboard(companyId: number): Promise<{
    totalShops: number;
    activeAds: number;
    totalAds: number;
  }> {
    return this.get(`/companies/${companyId}/dashboard`);
  }

  /**
   * Get company shops.
   * 
   * @param companyId - Company ID
   * @returns List of shops
   */
  async getCompanyShops(companyId: number): Promise<Array<{
    id: number;
    slug: string;
    name: string;
    companyId: number | null;
    domain: string | null;
    path: string | null;
    apiBase: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    return this.get(`/companies/${companyId}/shops`);
  }

  /**
   * Create a new shop for a company.
   * 
   * @param companyId - Company ID
   * @param data - Shop data
   * @returns Created shop
   */
  async createCompanyShop(companyId: number, data: {
    name: string;
    slug?: string;
    domain?: string;
    path?: string;
    apiBase?: string;
  }): Promise<{
    id: number;
    slug: string;
    name: string;
    companyId: number | null;
    domain: string | null;
    path: string | null;
    apiBase: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.post(`/companies/${companyId}/shops`, data);
  }

  /**
   * Update a shop.
   * 
   * @param companyId - Company ID
   * @param shopId - Shop ID
   * @param data - Update data
   * @returns Updated shop
   */
  async updateCompanyShop(companyId: number, shopId: number, data: {
    name?: string;
    slug?: string;
    domain?: string | null;
    path?: string | null;
    apiBase?: string | null;
  }): Promise<{
    id: number;
    slug: string;
    name: string;
    companyId: number | null;
    domain: string | null;
    path: string | null;
    apiBase: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.patch(`/companies/${companyId}/shops/${shopId}`, data);
  }

  /**
   * Delete a shop.
   * 
   * @param companyId - Company ID
   * @param shopId - Shop ID
   * @returns Success message
   */
  async deleteCompanyShop(companyId: number, shopId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.delete(`/companies/${companyId}/shops/${shopId}`);
  }

  // ==================== Analytics Endpoints ====================

  /**
   * Get analytics for a shop.
   * 
   * @param shopSlug - Shop identifier
   * @param days - Number of days to analyze (optional)
   * @returns Analytics data
   */
  async getAnalytics(shopSlug: string, days?: number): Promise<any> {
    const params = days ? `?days=${days}` : '';
    return this.get(`/shops/${shopSlug}/analytics${params}`);
  }

  // ==================== Shop Endpoints ====================

  /**
   * Get all shops.
   * 
   * @returns Array of shops (public fields only)
   * 
   * @example
   * ```typescript
   * const shops = await api.getAllShops();
   * console.log(`Found ${shops.length} shops`);
   * ```
   */
  async getAllShops(): Promise<Array<{
    id: number;
    slug: string;
    name: string;
    domain: string | null;
    createdAt: Date;
  }>> {
    return this.get('/shops');
  }

  // ==================== Ad Management Endpoints ====================

  /**
   * Request presigned URL for uploading an ad.
   * 
   * @param data - Upload request data
   * @returns Presigned upload URL and ad ID
   * @throws {ApiError} If request fails
   */
  async requestAdUpload(data: {
    shopId?: number | null;
    mediaType: 'image' | 'video';
    mimeType: string;
    bytes: number;
    position?: number;
  }): Promise<{
    adId: number;
    uploadUrl: string;
    requiredHeaders: Record<string, string>;
    storageKey: string;
  }> {
    return this.post('/ads/uploads', data);
  }

  /**
   * Complete an ad upload by verifying the file.
   * 
   * @param adId - Ad ID from presign response
   * @returns Upload completion result
   * @throws {ApiError} If verification fails
   */
  async completeAdUpload(adId: number): Promise<{
    message: string;
    ad: {
      id: number;
      position: number;
      enabled: boolean;
      mediaType: string;
      mimeType: string;
      publicUrl: string;
      version: number;
    };
  }> {
    return this.post('/ads/uploads/complete', { adId });
  }

  /**
   * Get public manifest of enabled ads for a shop.
   * 
   * @param shopSlug - Shop slug identifier
   * @returns Manifest with ordered list of enabled ads
   * @throws {ApiError} If request fails
   */
  async getAdsManifest(shopSlug: string): Promise<{
    manifestVersion: number;
    ads: Array<{
      id: number;
      position: number;
      mediaType: string;
      url: string;
      version: number;
    }>;
  }> {
    return this.get(`/ads/public/manifest?shopSlug=${encodeURIComponent(shopSlug)}`);
  }

  /**
   * Get all ads for the current company (admin view).
   * 
   * @param shopId - Optional shop ID to filter by
   * @returns List of all ads (enabled and disabled)
   * @throws {ApiError} If request fails
   */
  async getAds(shopId?: number): Promise<Array<{
    id: number;
    companyId: number;
    shopId: number | null;
    position: number;
    enabled: boolean;
    mediaType: string;
    mimeType: string;
    bytes: number;
    storageKey: string;
    publicUrl: string;
    etag: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const query = shopId ? `?shopId=${shopId}` : '';
    return this.get(`/ads${query}`);
  }

  /**
   * Update an ad (enable/disable, reorder).
   * 
   * @param adId - Ad ID
   * @param data - Update data
   * @returns Updated ad
   * @throws {ApiError} If update fails
   */
  async updateAd(adId: number, data: {
    enabled?: boolean;
    position?: number;
  }): Promise<{
    id: number;
    companyId: number;
    shopId: number | null;
    position: number;
    enabled: boolean;
    mediaType: string;
    mimeType: string;
    bytes: number;
    storageKey: string;
    publicUrl: string;
    etag: string | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }> {
    return this.patch(`/ads/${adId}`, data);
  }

  /**
   * Delete an ad.
   * 
   * @param adId - Ad ID
   * @returns Success message
   * @throws {ApiError} If deletion fails
   */
  async deleteAd(adId: number): Promise<{ message: string }> {
    return this.delete(`/ads/${adId}`);
  }

  /**
   * Get WebSocket URL for real-time updates.
   * 
   * @returns WebSocket URL or null if not available
   */
  getWebSocketUrl(): string | null {
    const baseUrl = this.baseUrl;
    if (!baseUrl) return null;
    
    // Convert HTTP/HTTPS to WS/WSS
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // If baseUrl is a full URL, extract host; otherwise use current host
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

