import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApiError } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract a user-friendly error message from an error object.
 * 
 * Handles various error types:
 * - ApiError instances (from API client)
 * - Standard Error objects
 * - Objects with error property
 * - Unknown error types
 * 
 * @param error - Error to extract message from
 * @param fallback - Fallback message if extraction fails (default: 'Ocorreu um erro. Tente novamente.')
 * @returns User-friendly error message
 * 
 * @example
 * ```typescript
 * try {
 *   await api.createTicket(slug, data);
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   setError(message);
 * }
 * ```
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = 'Ocorreu um erro. Tente novamente.'
): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object' && 'error' in error) {
    const errorObj = error as { error: unknown };
    if (typeof errorObj.error === 'string') {
      return errorObj.error;
    }
  }

  return fallback;
}

