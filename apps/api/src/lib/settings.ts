import { DEFAULT_SETTINGS, shopSettingsSchema } from '@eutonafila/shared';
import type { ShopSettings } from '@eutonafila/shared';

export { DEFAULT_SETTINGS };
export type { ShopSettings };

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
