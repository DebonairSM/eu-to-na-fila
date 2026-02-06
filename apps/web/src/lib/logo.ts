/**
 * Single source of truth for the EuTô NaFila logo.
 * Uses BASE_URL so the logo loads correctly for both the projects/mineiro build (/projects/mineiro/) and root build (/).
 * Cache-bust param ensures all instances get the current file after updates.
 */
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
export const LOGO_URL = `${BASE}logo-eutonafila.png?v=2`;
