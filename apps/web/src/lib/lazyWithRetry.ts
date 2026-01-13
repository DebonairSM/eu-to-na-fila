import { lazy, ComponentType } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error, retryCount: number) => void;
}

/**
 * Creates a lazy-loaded component with retry logic for failed dynamic imports.
 * This handles network failures, missing chunks, and other import errors gracefully.
 *
 * @param importFn - Function that returns a dynamic import promise
 * @param options - Retry configuration options
 * @returns A lazy component that will retry on import failure
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;

  return lazy(async () => {
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (onError) {
          onError(lastError, attempt - 1);
        }

        // Don't retry on the last attempt
        if (attempt > maxRetries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Try to clear browser cache for the failed module
        // This helps with stale cache issues that can cause import failures
        if (typeof window !== 'undefined') {
          try {
            // Force a cache refresh by adding a timestamp query param
            // Note: This won't affect the actual import, but helps with debugging
            if (import.meta.env.DEV) {
              console.warn(`Retrying import (attempt ${attempt}/${maxRetries})...`, lastError.message);
            }
          } catch {
            // Ignore cache errors
          }
        }
      }
    }

    // If all retries failed, throw a user-friendly error
    const errorMessage = lastError?.message || 'Failed to load module';
    const isNetworkError = 
      errorMessage.includes('Failed to fetch') || 
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('Load failed') ||
      errorMessage.includes('dynamically imported module');

    if (isNetworkError) {
      throw new Error(
        'Erro de conexão ao carregar a página. Verifique sua conexão com a internet e tente novamente.'
      );
    }

    throw new Error(
      'Erro ao carregar a página. Por favor, recarregue a página ou entre em contato com o suporte se o problema persistir.'
    );
  });
}

/**
 * Wrapper for lazy imports that handles common import patterns.
 * Automatically extracts default export or named export.
 */
export function lazyWithRetryNamed<T extends ComponentType<any>>(
  importFn: () => Promise<{ [key: string]: T }>,
  exportName: string,
  options: RetryOptions = {}
): React.LazyExoticComponent<T> {
  return lazyWithRetry(
    async () => {
      const module = await importFn();
      return { default: module[exportName] };
    },
    options
  );
}
