import { DEFAULT_THEME, themeSchema } from '@eutonafila/shared';
import type { ShopTheme } from '@eutonafila/shared';

export { themeSchema, DEFAULT_THEME };
export type { ShopTheme };

/**
 * Parse a JSON theme string from the database and merge with defaults.
 * Uses the Zod schema with .default() values so adding a new field to the
 * schema automatically propagates without touching this function (OCP).
 */
export function parseTheme(themeJson: string | null): Required<ShopTheme> {
  if (!themeJson) return { ...DEFAULT_THEME };
  try {
    const raw = JSON.parse(themeJson);
    // themeSchema.parse() fills in defaults for any missing fields
    return themeSchema.parse(raw) as Required<ShopTheme>;
  } catch {
    return { ...DEFAULT_THEME };
  }
}
