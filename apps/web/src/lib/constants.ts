/**
 * Application constants for timeouts, intervals, and configuration values.
 */

/**
 * Polling intervals in milliseconds
 */
export const POLL_INTERVALS = {
  /** Standard queue polling interval (3 seconds) */
  QUEUE: 3000,
  /** Ticket status polling interval (3 seconds) */
  TICKET_STATUS: 3000,
  /** Wait times polling interval (30 seconds) */
  WAIT_TIMES: 30000,
  /** Kiosk mode queue polling interval (10 seconds) */
  KIOSK_QUEUE: 10000,
  /** Management mode queue polling interval (5 seconds) */
  MANAGEMENT_QUEUE: 5000,
} as const;

/**
 * Timeout durations in milliseconds
 */
export const TIMEOUTS = {
  /** Error message display duration (5 seconds) */
  ERROR_MESSAGE: 5000,
  /** Success message display duration (3 seconds) */
  SUCCESS_MESSAGE: 3000,
  /** Share success message duration (3 seconds) */
  SHARE_SUCCESS: 3000,
  /** Auto-focus delay for modals (100ms) */
  MODAL_FOCUS_DELAY: 100,
  /** Hash scroll delay (100ms) */
  HASH_SCROLL_DELAY: 100,
  /** Navigation scroll delay (300ms) */
  NAVIGATION_SCROLL_DELAY: 300,
} as const;

/**
 * Kiosk mode view durations in milliseconds
 */
export const KIOSK_VIEW_DURATIONS = {
  /** Queue view duration (15 seconds) */
  QUEUE: 15000,
  /** Ad view duration (10 seconds) */
  AD: 10000,
} as const;

/**
 * Storage keys
 */
export const STORAGE_KEYS = {
  /** Active ticket ID storage key */
  ACTIVE_TICKET_ID: 'eutonafila_active_ticket_id',
} as const;

/**
 * Default service ID
 */
export const DEFAULT_SERVICE_ID = 1;

/**
 * Header offset for scroll calculations (in pixels)
 */
export const HEADER_OFFSET = 100;

