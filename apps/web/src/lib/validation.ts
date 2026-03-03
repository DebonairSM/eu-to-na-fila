/**
 * Shared validation helpers for forms.
 * Return true if valid; callers use t() for error messages.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Non-empty trimmed string */
export function validateRequired(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Basic email format */
export function validateEmail(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return EMAIL_REGEX.test(value.trim());
}

/** Optional: non-empty then digits/spaces/plus only, min length for a phone */
export function validatePhone(value: string, required = false): boolean {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length === 0) return !required;
  return /^[\d\s+()-]+$/.test(trimmed) && trimmed.replace(/\D/g, '').length >= 8;
}
