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
  /** Device ID storage key - persistent identifier for device-based ticket blocking */
  DEVICE_ID: 'eutonafila_device_id',
  /** UI locale (e.g. pt-BR, en) for i18n */
  LOCALE: 'eutonafila_locale',
  /** Customer name for remember-my-info (localStorage fallback) */
  CUSTOMER_NAME: 'eutonafila_customer_name',
  /** Customer phone for remember-my-info (localStorage fallback) */
  CUSTOMER_PHONE: 'eutonafila_customer_phone',
} as const;

/**
 * Supported UI locales for i18n
 */
export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;

/**
 * Default UI locale
 */
export const DEFAULT_LOCALE = 'pt-BR';

/**
 * Default service ID
 */
export const DEFAULT_SERVICE_ID = 1;

/**
 * Header offset for scroll calculations (in pixels)
 */
export const HEADER_OFFSET = 100;

/**
 * Day-of-week order as returned by the API (getDay(): 0=Sunday, 1=Monday, ...)
 */
export const DAY_ORDER_API = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * Portuguese labels for day-of-week (short for charts).
 * Keys match API day names.
 */
export const DAY_NAMES_PT: Record<string, string> = {
  Sunday: 'Dom',
  Monday: 'Seg',
  Tuesday: 'Ter',
  Wednesday: 'Qua',
  Thursday: 'Qui',
  Friday: 'Sex',
  Saturday: 'Sáb',
};

/**
 * Portuguese full names for day-of-week (for text like "Segunda é o dia mais movimentado").
 */
export const DAY_NAMES_PT_FULL: Record<string, string> = {
  Sunday: 'Domingo',
  Monday: 'Segunda-feira',
  Tuesday: 'Terça-feira',
  Wednesday: 'Quarta-feira',
  Thursday: 'Quinta-feira',
  Friday: 'Sexta-feira',
  Saturday: 'Sábado',
};

