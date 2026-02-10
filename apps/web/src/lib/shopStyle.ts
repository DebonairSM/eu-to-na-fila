import type { FontToken } from '@eutonafila/shared';

const FONT_STACKS: Record<FontToken, string> = {
  inter:
    "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'",
  playfair_display: "'Playfair Display', ui-serif, Georgia, 'Times New Roman', Times, serif",
  cormorant_garamond: "'Cormorant Garamond', ui-serif, Georgia, 'Times New Roman', Times, serif",
  lora: "'Lora', ui-serif, Georgia, 'Times New Roman', Times, serif",
  abril_fatface: "'Abril Fatface', ui-serif, Georgia, 'Times New Roman', Times, serif",
  crimson_text: "'Crimson Text', ui-serif, Georgia, 'Times New Roman', Times, serif",
  oswald:
    "'Oswald', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial",
  roboto_condensed:
    "'Roboto Condensed', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial",
  dm_sans:
    "'DM Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial",
  montserrat:
    "'Montserrat', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial",
};

const GOOGLE_FONTS_FAMILY: Record<FontToken, string> = {
  inter: 'Inter:wght@300;400;500;600;700;800;900',
  playfair_display: 'Playfair+Display:wght@400;500;600;700;800;900',
  cormorant_garamond: 'Cormorant+Garamond:wght@300;400;500;600;700',
  lora: 'Lora:wght@400;500;600;700',
  abril_fatface: 'Abril+Fatface',
  crimson_text: 'Crimson+Text:wght@400;600;700',
  oswald: 'Oswald:wght@300;400;500;600;700',
  roboto_condensed: 'Roboto+Condensed:wght@300;400;500;600;700',
  dm_sans: 'DM+Sans:wght@300;400;500;600;700;800;900',
  montserrat: 'Montserrat:wght@300;400;500;600;700;800;900',
};

export function fontTokenToStack(token: FontToken): string {
  return FONT_STACKS[token];
}

export function buildGoogleFontsUrl(tokens: FontToken[]): string {
  const unique = Array.from(new Set(tokens));
  const families = unique.map((t) => `family=${GOOGLE_FONTS_FAMILY[t]}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Loads a curated Google Fonts stylesheet for the required font tokens.
 * Replaces a previous link tag to avoid unbounded growth.
 */
export function ensureGoogleFontsLoaded(tokens: FontToken[]): void {
  if (typeof document === 'undefined') return;
  const id = 'shop-google-fonts';
  const href = buildGoogleFontsUrl(tokens);
  const existing = document.getElementById(id) as HTMLLinkElement | null;
  if (existing?.href === href) return;
  existing?.remove();
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

