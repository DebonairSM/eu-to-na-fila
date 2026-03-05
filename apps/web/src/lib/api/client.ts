import type { ApiErrorResponse } from '@eutonafila/shared';
import { ApiError } from './errors.js';
import { getShopBasePath } from '../config.js';

/**
 * Base API client. Handles HTTP requests, auth tokens, and error transformation.
 * Domain modules extend this via mixins.
 * When baseUrl is relative (e.g. /api), it is resolved against the current shop path
 * so that from /barbershop/status we request /barbershop/api.
 */
const REMEMBER_ME_FLAG = 'eutonafila_remember_me';

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
      let storedToken = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (!storedToken && localStorage.getItem(REMEMBER_ME_FLAG) === 'true') {
        storedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      }
      if (storedToken) {
        this.authToken = storedToken;
      }
    } catch {
      // sessionStorage/localStorage might not be available during module init
    }
  }

  setOnAuthError(callback: () => void): void {
    this.onAuthError = callback;
  }

  setOnNetworkStatus(callbacks: { onFailure?: () => void; onSuccess?: () => void }): void {
    this.onNetworkFailure = callbacks.onFailure;
    this.onNetworkSuccess = callbacks.onSuccess;
  }

  getBaseUrl(): string {
    return this.getEffectiveBaseUrl();
  }

  setAuthToken(token: string): void {
    this.authToken = token;
    sessionStorage.setItem(this.TOKEN_STORAGE_KEY, token);
  }

  clearAuthToken(): void {
    this.authToken = undefined;
    sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private static readonly RETRY_DELAY_MS = 1000;
  private static readonly RETRYABLE_STATUSES = [502, 503, 504];

  /**
   * Resolve effective base URL.
   * - Absolute URL (http/https): used as-is.
   * - Dev: use /api so Vite proxy (mounted at /api) works.
   * - Production with relative base: prefix with shop path so e.g. /barbershop/status -> /barbershop/api.
   */
  protected getEffectiveBaseUrl(): string {
    if (this.baseUrl.startsWith('http://') || this.baseUrl.startsWith('https://')) {
      return this.baseUrl;
    }
    const suffix = this.baseUrl.startsWith('/') ? this.baseUrl : `/${this.baseUrl}`;
    if (import.meta.env.DEV) {
      return suffix;
    }
    const base = typeof window !== 'undefined' ? getShopBasePath() : '';
    return base === '/' || base === '' ? suffix : `${base}${suffix}`;
  }

  protected async request<T>(
    path: string,
    options: (RequestInit & { disableRetry?: boolean }) = {},
    timeoutMs = 30000,
    isRetry = false
  ): Promise<T> {
    const { disableRetry = false, ...fetchOptions } = options;
    const url = `${this.getEffectiveBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {};
    const method = fetchOptions.method || 'GET';
    const methodsWithBody = ['POST', 'PATCH', 'PUT'];
    if (methodsWithBody.includes(method)) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    if (fetchOptions.headers) {
      Object.assign(headers, fetchOptions.headers);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
        cache: method === 'GET' ? 'no-store' : fetchOptions.cache,
      });

      const responseText = await response.text();
      const hasBody = responseText.trim().length > 0;

      let data: unknown = null;
      if (hasBody) {
        try {
          data = JSON.parse(responseText);
        } catch {
          if (response.ok) {
            throw new ApiError(
              `Server returned invalid response (${response.status} ${response.statusText}): ${responseText.substring(0, 100)}`,
              response.status,
              'INVALID_RESPONSE'
            );
          }
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
      }

      if (!response.ok) {
        const errorObj =
          data && typeof data === 'object' && !Array.isArray(data)
            ? (data as Partial<ApiErrorResponse> & { errors?: unknown })
            : undefined;
        const message =
          typeof errorObj?.error === 'string' && errorObj.error.length > 0
            ? errorObj.error
            : response.status === 502
              ? (import.meta.env.DEV
                  ? 'API não está respondendo. Rode pnpm dev para subir o servidor.'
                  : 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.')
              : `Request failed (${response.status} ${response.statusText})`;
        const code =
          typeof errorObj?.code === 'string' && errorObj.code.length > 0
            ? errorObj.code
            : response.status >= 500
              ? 'SERVER_ERROR'
              : 'API_ERROR';
        const apiError = new ApiError(
          message,
          response.status,
          code,
          Array.isArray(errorObj?.errors)
            ? (errorObj.errors as Array<{ field: string; message: string }>)
            : undefined
        );
        const retryable =
          !disableRetry &&
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
      const retryable = !disableRetry && !isRetry && (isAbort || isNetwork);
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

  protected async get<T>(path: string, timeoutMs?: number, options?: { disableRetry?: boolean }): Promise<T> {
    return this.request<T>(
      path,
      { method: 'GET', ...(options?.disableRetry ? { disableRetry: true } : {}) },
      timeoutMs ?? 30000
    );
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
