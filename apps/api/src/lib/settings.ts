import { DEFAULT_SETTINGS, shopSettingsSchema } from '@eutonafila/shared';
import type { ShopSettings } from '@eutonafila/shared';

export { DEFAULT_SETTINGS };
export type { ShopSettings };

const KIOSK_PASSWORD_HASH_KEY = 'kioskPasswordHash';

/**
 * Parse a settings object from the database and merge with defaults.
 * Uses Zod .default() so adding a new field to shopSettingsSchema
 * automatically propagates without touching this function.
 */
export function parseSettings(raw: unknown): ShopSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  try {
    return shopSettingsSchema.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Prepare settings for storage: hash kioskPassword into kioskPasswordHash, remove plaintext.
 */
export async function prepareSettingsForStorage(
  merged: Record<string, unknown>,
  hashPasswordFn: (p: string) => Promise<string>
): Promise<Record<string, unknown>> {
  const out = { ...merged };
  if (out.kioskPassword !== undefined) {
    if (typeof out.kioskPassword === 'string' && out.kioskPassword.trim() !== '') {
      out[KIOSK_PASSWORD_HASH_KEY] = await hashPasswordFn(out.kioskPassword.trim());
    } else {
      out[KIOSK_PASSWORD_HASH_KEY] = null;
    }
    delete out.kioskPassword;
  }
  return out;
}

/**
 * Remove server-only keys from settings before sending to client.
 */
export function sanitizeSettingsForClient(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== 'object') return {};
  const out = { ...settings } as Record<string, unknown>;
  delete out[KIOSK_PASSWORD_HASH_KEY];
  return out;
}

export function getKioskPasswordHash(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object') return null;
  const v = (settings as Record<string, unknown>)[KIOSK_PASSWORD_HASH_KEY];
  return typeof v === 'string' ? v : null;
}
