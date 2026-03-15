/**
 * Tracking cookie: set only when user has consented to tracking.
 * When consent is denied, we do not set (or we clear) this cookie.
 */

const TRACKING_COOKIE_NAME = 'eutonafila_tracking_id';
const TRACKING_COOKIE_MAX_AGE_DAYS = 365;
const TRACKING_COOKIE_PATH = '/';

function getCookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host === 'localhost' || host.startsWith('127.')) return '';
  return host;
}

/**
 * Set the tracking cookie with the given value (e.g. deviceId).
 * Call only when the user has consented to tracking.
 */
export function setTrackingCookie(value: string): void {
  if (typeof document === 'undefined' || !value || value.trim().length === 0) return;
  const maxAge = TRACKING_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  let cookie = `${TRACKING_COOKIE_NAME}=${encodeURIComponent(value.trim())}; path=${TRACKING_COOKIE_PATH}; max-age=${maxAge}; samesite=lax`;
  const domain = getCookieDomain();
  if (domain) cookie += `; domain=${domain}`;
  document.cookie = cookie;
}

/**
 * Remove the tracking cookie. Call when user has denied consent
 * (e.g. after join with deny, or when revoking consent on account page).
 */
export function clearTrackingCookie(): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  document.cookie = `${TRACKING_COOKIE_NAME}=; path=${TRACKING_COOKIE_PATH}; max-age=0`;
  if (domain) {
    document.cookie = `${TRACKING_COOKIE_NAME}=; path=${TRACKING_COOKIE_PATH}; max-age=0; domain=${domain}`;
  }
}

/**
 * Apply consent result: set cookie when allowed, clear when denied.
 * Call after a successful join (or when user changes preference).
 */
export function applyTrackingConsent(consent: boolean, trackingId: string): void {
  if (consent) {
    setTrackingCookie(trackingId);
  } else {
    clearTrackingCookie();
  }
}
