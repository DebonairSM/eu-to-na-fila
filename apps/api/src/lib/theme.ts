import { DEFAULT_THEME, themeSchema, shopStyleConfigSchema, resolveShopStyle } from '@eutonafila/shared';
import type { ShopTheme, ShopStyleResolved, ShopStyleConfig } from '@eutonafila/shared';

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

/**
 * Parse style config stored inside the theme JSON under `style` and resolve it
 * to the full set of style tokens consumed by the frontend.
 *
 * This is intentionally separate from `parseTheme()` so `ShopTheme` stays as
 * colors-only and style can evolve independently.
 */
export function parseStyleConfig(themeJson: string | null): ShopStyleConfig {
  if (!themeJson) return shopStyleConfigSchema.parse({});
  try {
    const raw = JSON.parse(themeJson) as unknown;
    const styleRaw =
      typeof raw === 'object' && raw !== null && 'style' in (raw as any)
        ? (raw as any).style
        : {};
    return shopStyleConfigSchema.parse(styleRaw);
  } catch {
    return shopStyleConfigSchema.parse({});
  }
}

export function parseResolvedStyle(themeJson: string | null): ShopStyleResolved {
  return resolveShopStyle(parseStyleConfig(themeJson));
}
