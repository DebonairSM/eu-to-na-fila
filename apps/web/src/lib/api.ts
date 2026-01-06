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

      // Parse response
      const data = await response.json();

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
   * POST request helper for multipart/form-data.
   */
  private async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};

    // Add auth token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:258',message:'postFormData fetch starting',data:{url,hasAuth:!!this.authToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:265',message:'postFormData fetch completed',data:{url,status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Capture response text before parsing
    const responseText = await response.text();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:268',message:'postFormData response text captured',data:{url,status:response.status,responseTextLength:responseText.length,responseTextPreview:responseText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    let data;
    if (responseText.trim() === '') {
      // Empty response - create error object
      data = {
        error: `Server returned empty response (${response.status} ${response.statusText})`,
        statusCode: response.status,
        code: 'EMPTY_RESPONSE',
      };
    } else {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // Invalid JSON - create error object
        data = {
          error: `Server returned invalid JSON (${response.status} ${response.statusText}): ${responseText.substring(0, 100)}`,
          statusCode: response.status,
          code: 'INVALID_JSON',
        };
      }
    }

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
    createdAt: Date;
    updatedAt: Date;
  }>> {
    return this.get(`/companies/${companyId}/shops`);
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
   * Upload an ad image.
   * 
   * @param file - Image file to upload
   * @param adType - Type of ad: 'ad1' or 'ad2'
   * @returns Upload result with file path
   * @throws {ApiError} If upload fails
   * 
   * @example
   * ```typescript
   * const file = event.target.files[0];
   * const result = await api.uploadAdImage(file, 'ad1');
   * console.log(`Uploaded to ${result.path}`);
   * ```
   */
  async uploadAdImage(file: File, adType: 'ad1' | 'ad2'): Promise<{
    message: string;
    filename: string;
    path: string;
  }> {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:718',message:'uploadAdImage called',data:{adType,fileName:file.name,fileSize:file.size,fileType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const formData = new FormData();
    formData.append('file', file);
    formData.append('adType', adType);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:724',message:'FormData created, calling postFormData',data:{adType,hasFile:true,hasAdType:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    const result = await this.postFormData('/ads/upload', formData);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:727',message:'postFormData completed',data:{adType,result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return result;
  }

  /**
   * Get ad images status.
   * 
   * @returns Status of ad images
   * @throws {ApiError} If request fails
   * 
   * @example
   * ```typescript
   * const status = await api.getAdStatus();
   * console.log(`Ad1 exists: ${status.ad1.exists}`);
   * ```
   */
  async getAdStatus(): Promise<{
    ad1: { exists: boolean; path: string | null };
    ad2: { exists: boolean; path: string | null };
  }> {
    return this.get('/ads/status');
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

