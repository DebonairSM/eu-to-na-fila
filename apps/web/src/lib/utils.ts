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

/**
 * Format a name by capitalizing the first letter of each word
 * and converting all other letters to lowercase.
 * 
 * Handles edge cases:
 * - Empty strings return empty string
 * - Multiple spaces are preserved but collapsed
 * - Handles special characters and accented letters
 * 
 * @param name - Name string to format
 * @returns Formatted name with first letter of each word capitalized
 * 
 * @example
 * ```typescript
 * formatName('john') // 'John'
 * formatName('MARY JANE') // 'Mary Jane'
 * formatName('  joão  silva  ') // 'João Silva'
 * ```
 */
export function formatName(name: string): string {
  if (!name || name.trim().length === 0) {
    return name;
  }

  // Split by whitespace, format each word, then rejoin
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

