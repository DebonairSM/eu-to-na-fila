import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ApiError } from './api';
import { STORAGE_KEYS } from './constants';

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
  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);
  const formatted = words
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  return formatted;
}

/**
 * Format a full name for public display by showing only first name and last initial.
 * This is used to protect privacy when displaying names in queue views.
 * 
 * Handles edge cases:
 * - Single name returns as-is
 * - Multiple names: first name + last initial
 * - Empty strings return empty string
 * 
 * @param fullName - Full name string (e.g., "João Silva" or "Maria Santos")
 * @returns Formatted name with last name abbreviated (e.g., "João S." or "Maria S.")
 * 
 * @example
 * ```typescript
 * formatNameForDisplay('João Silva') // 'João S.'
 * formatNameForDisplay('Maria Santos') // 'Maria S.'
 * formatNameForDisplay('Pedro') // 'Pedro'
 * formatNameForDisplay('  joão  silva  ') // 'João S.'
 * ```
 */
export function formatNameForDisplay(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) {
    return fullName;
  }

  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  // If only one word, return as-is
  if (words.length === 1) {
    return formatName(words[0]);
  }
  
  // Format first name
  const firstName = formatName(words[0]);
  
  // Get last name and take first letter
  const lastName = words[words.length - 1];
  const lastInitial = lastName.charAt(0).toUpperCase();
  
  return `${firstName} ${lastInitial}.`;
}

/**
 * Get or generate a persistent device ID for ticket creation.
 * Device ID is stored in localStorage and persists across sessions.
 * Used to prevent multiple active tickets from the same device.
 * 
 * @returns Device ID string (UUID v4 format)
 * 
 * @example
 * ```typescript
 * const deviceId = getOrCreateDeviceId();
 * await api.createTicket(slug, { ...data, deviceId });
 * ```
 */
export function getOrCreateDeviceId(): string {
  // Try to get existing device ID from localStorage
  const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  // Generate new device ID using crypto.randomUUID() if available, otherwise fallback
  let deviceId: string;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    deviceId = crypto.randomUUID();
  } else {
    // Fallback for browsers that don't support randomUUID
    // Generate a UUID v4-like string
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Store in localStorage for persistence
  localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  return deviceId;
}
