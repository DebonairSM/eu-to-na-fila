/**
 * Simple logging utility for the application.
 * In development, logs to console. In production, can be extended to send to logging service.
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Log an error message.
 * In development, logs to console.error.
 * In production, can be extended to send to error tracking service.
 */
export function logError(message: string, error?: unknown): void {
  if (isDevelopment) {
    console.error(message, error);
  }
  // In production, could send to error tracking service (e.g., Sentry)
}

/**
 * Log a warning message.
 * In development, logs to console.warn.
 */
export function logWarning(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(message, ...args);
  }
}

/**
 * Log an info message.
 * In development, logs to console.info.
 */
export function logInfo(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.info(message, ...args);
  }
}

