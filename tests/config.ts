/**
 * E2E test URLs. Override via env for different ports.
 * Defaults match apps/web (port 4040) and apps/api (port 4041).
 */
const WEB_PORT = process.env.WEB_PORT ?? '4040';
const API_PORT = process.env.API_PORT ?? '4041';

export const testConfig = {
  /** Base URL for the web app (Playwright page navigation). */
  webBaseUrl: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${WEB_PORT}`,
  /** Base URL for the API (no /api suffix). */
  apiBaseUrl: process.env.API_BASE_URL ?? `http://localhost:${API_PORT}`,
  /** API path prefix. */
  apiPath: '/api',
} as const;

/** Full API base URL including path (e.g. http://localhost:4041/api). */
export const apiBaseUrlWithPath = `${testConfig.apiBaseUrl}${testConfig.apiPath}`;
