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

/** Returns Unicode flag emoji for a 2-letter ISO country code (e.g. BR -> 🇧🇷). */
export function getCountryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '';
  const c = code.toUpperCase();
  return String.fromCodePoint(
    ...[...c].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
  );
}

/** Country codes to show at the top of the phone country selector, in order. */
const COUNTRY_PRIORITY: CountryCode[] = ['BR', 'PT', 'US', 'CA', 'DE'];

export function getCountryOptions(locale: string): CountryOption[] {
  const displayNames = typeof Intl !== 'undefined'
    ? new Intl.DisplayNames([locale], { type: 'region' })
    : null;

  const options = getCountries()
    .map((code) => ({
      code,
      name: displayNames?.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }));

  return options.sort((a, b) => {
    const aIndex = COUNTRY_PRIORITY.indexOf(a.code);
    const bIndex = COUNTRY_PRIORITY.indexOf(b.code);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
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
    // #region agent log
    fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'join-add-run',hypothesisId:'H2',location:'utils.ts:redirectToStatusPage:windowAssign',message:'redirect via window.location.assign',data:{ticketId,ticketShopSlug,currentShopSlug:currentShopSlug??null,basePath,target:`${basePath}/status/${ticketId}`},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    window.location.assign(`${basePath}/status/${ticketId}`);
    return;
  }
  // #region agent log
  fetch('http://127.0.0.1:7715/ingest/c5f9b148-dd94-43ba-849b-22997c31e044',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'1b841d'},body:JSON.stringify({sessionId:'1b841d',runId:'join-add-run',hypothesisId:'H2',location:'utils.ts:redirectToStatusPage:navigate',message:'redirect via react navigate',data:{ticketId,currentShopSlug:currentShopSlug??null,target:`/status/${ticketId}`},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  navigate(`/status/${ticketId}`, { replace: true });
}
