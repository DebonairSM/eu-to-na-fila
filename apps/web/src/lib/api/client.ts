import type { ApiErrorResponse } from '@eutonafila/shared';
import { ApiError } from './errors.js';

/**
 * Base API client. Handles HTTP requests, auth tokens, and error transformation.
 * Domain modules extend this via mixins.
 */
export class BaseApiClient {
  protected baseUrl: string;
  protected authToken?: string;
  protected readonly TOKEN_STORAGE_KEY = 'eutonafila_auth_token';
  protected onAuthError?: () => void;
  protected onNetworkFailure?: () => void;
  protected onNetworkSuccess?: () => void;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    try {
      const storedToken = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (storedToken) {
        this.authToken = storedToken;
      }
    } catch {
      // sessionStorage might not be available during module init
    }
  }

  setOnAuthError(callback: () => void): void {
    this.onAuthError = callback;
  }

  setOnNetworkStatus(callbacks: { onFailure?: () => void; onSuccess?: () => void }): void {
    this.onNetworkFailure = callbacks.onFailure;
    this.onNetworkSuccess = callbacks.onSuccess;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    sessionStorage.setItem(this.TOKEN_STORAGE_KEY, token);
  }

  clearAuthToken(): void {
    this.authToken = undefined;
    sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
  }

  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly RETRYABLE_STATUSES = [502, 503, 504];

  protected async request<T>(
    path: string,
    options: RequestInit = {},
    timeoutMs = 30000,
    isRetry = false
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {};
    const method = options.method || 'GET';
    const methodsWithBody = ['POST', 'PATCH', 'PUT'];
    if (methodsWithBody.includes(method)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
        cache: method === 'GET' ? 'no-store' : options.cache,
      });

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (response.status === 502) {
          data = {
            error: import.meta.env.DEV
              ? 'API não está respondendo. Rode pnpm dev para subir o servidor.'
              : 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
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
        const retryable =
          !isRetry &&
          BaseApiClient.RETRYABLE_STATUSES.includes(response.status);
        if (retryable) {
          clearTimeout(timeoutId);
          await new Promise((r) => setTimeout(r, BaseApiClient.RETRY_DELAY_MS));
          return this.request<T>(path, options, timeoutMs, true);
        }
        if (apiError.isAuthError() && this.onAuthError) {
          this.onAuthError();
        }
        const isNetworkLikeError =
          response.status === 408 ||
          (response.status >= 500 && response.status < 600);
        if (isNetworkLikeError) {
          this.onNetworkFailure?.();
        }
        throw apiError;
      }

      this.onNetworkSuccess?.();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) {
        if (error.isAuthError() && this.onAuthError) {
          this.onAuthError();
        }
        throw error;
      }
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const isNetwork = error instanceof TypeError;
      const retryable = !isRetry && (isAbort || isNetwork);
      if (retryable) {
        await new Promise((r) => setTimeout(r, BaseApiClient.RETRY_DELAY_MS));
        return this.request<T>(path, options, timeoutMs, true);
      }
      this.onNetworkFailure?.();
      if (isAbort) {
        throw new ApiError('Request timed out - please check your connection', 408, 'TIMEOUT_ERROR');
      }
      if (isNetwork) {
        throw new ApiError('Network error - please check your connection', 0, 'NETWORK_ERROR');
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error',
        500,
        'UNKNOWN_ERROR'
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected async get<T>(path: string, timeoutMs?: number): Promise<T> {
    return this.request<T>(path, { method: 'GET' }, timeoutMs ?? 30000);
  }

  protected async post<T>(path: string, body: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) }, timeoutMs ?? 30000);
  }

  protected async patch<T>(path: string, body: unknown, timeoutMs?: number): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, timeoutMs ?? 30000);
  }

  protected async del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
