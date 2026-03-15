import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AsYouType, getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import { ApiError } from './api';
import { getShopBasePath } from './config';
import { STORAGE_KEYS } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True if the shop has scheduling (appointments) enabled. Used to show schedule CTAs; operating hours may still be required for slots. */
export function hasScheduleEnabled(settings: { allowAppointments?: boolean; operatingHours?: unknown }): boolean {
  return !!settings?.allowAppointments;
}

/** Truncate label for select options so long service/barber names fit. Full text available via title. */
export function truncateOptionLabel(text: string, maxLen: number = 40): string {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + '\u2026';
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

const NAME_CONNECTORS = new Set(['da', 'das', 'de', 'del', 'della', 'di', 'do', 'dos', 'du', 'e', 'la', 'le', 'van', 'von']);

/**
 * Formats person names while keeping common connectors lowercase.
 * First and last words are always capitalized.
 */
export function formatNameWithConnectors(name: string): string {
  if (!name || name.trim().length === 0) {
    return name;
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';

  const formatted = words.map((word, index) => {
    const normalized = word.toLowerCase();
    const isFirst = index === 0;
    const isLast = index === words.length - 1;

    if (!isFirst && !isLast && NAME_CONNECTORS.has(normalized)) {
      return normalized;
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  });

  return formatted.join(' ');
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
}

export function getCountryOptions(locale: string): CountryOption[] {
  const displayNames = typeof Intl !== 'undefined'
    ? new Intl.DisplayNames([locale], { type: 'region' })
    : null;

  return getCountries()
    .map((code) => ({
      code,
      name: displayNames?.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Formats input as user types according to the selected country.
 */
export function formatPhoneByCountry(rawInput: string, country: CountryCode): string {
  const formatter = new AsYouType(country);
  const formatted = formatter.input(rawInput);
  return formatted || formatter.getChars();
}

/**
 * Format a full name for compact display: first name plus last name initial.
 * Used in queue, status, and barber views so clients can enter first + last name
 * in the name box but only "First L." is shown elsewhere.
 *
 * - Single name returns as-is (capitalized)
 * - Two or more words: first name + initial of last word (e.g. "João Silva" -> "João S.", "João Carlos Silva" -> "João S.")
 * - Empty strings return empty string
 */
export function formatNameForDisplay(fullName: string): string {
  if (!fullName || fullName.trim().length === 0) {
    return fullName;
  }

  const trimmed = fullName.trim();
  const words = trimmed.split(/\s+/).filter((word) => word.length > 0);

  if (words.length === 1) {
    return formatName(words[0]);
  }

  const firstName = formatName(words[0]);
  const lastWord = words[words.length - 1];
  const initial = lastWord.charAt(0).toUpperCase();

  return `${firstName} ${initial}.`;
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

/**
 * Redirect to the ticket status page. When ticketShopSlug is present, uses full path
 * so the app loads in the correct barbershop context (per-shop status).
 * Same-shop: use current base path; other shop: use short path /:slug (no /projects).
 */
export function redirectToStatusPage(
  ticketId: number,
  ticketShopSlug: string | undefined,
  navigate: (to: string, opts?: { replace?: boolean }) => void,
  currentShopSlug?: string
): void {
  if (ticketShopSlug) {
    const basePath =
      currentShopSlug === ticketShopSlug ? getShopBasePath() : `/${ticketShopSlug}`;
    window.location.assign(`${basePath}/status/${ticketId}`);
    return;
  }
  navigate(`/status/${ticketId}`, { replace: true });
}
