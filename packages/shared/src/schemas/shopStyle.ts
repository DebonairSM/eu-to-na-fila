import { z } from 'zod';

/**
 * Style presets control typography, shapes, borders, icon weight and color
 * suggestions. Layout is chosen separately via layoutIdSchema.
 */
export const stylePresetIdSchema = z.enum([
  'modern',
  'classical',
  'vintage',
  'luxury',
  'industrial',
  'minimal',
]);

export type StylePresetId = z.infer<typeof stylePresetIdSchema>;

/**
 * Layout controls hero structure, badge style, section title decoration and
 * decorative elements. Independent from preset (which drives fonts and colors).
 */
export const layoutIdSchema = z.enum([
  'centered',        // Single column, pill badge, no frame
  'centered_frame',  // Single column with bordered frame, thin section rule
  'split',           // Two columns with decorative icon block
  'minimal',         // Single column, minimal badge, text-only CTAs
  'luxury',          // Single column, gradient overlay, optional CTA shimmer
  'bold',            // Strong typography, thick section underlines
  'classic',         // Label-style badge, double frame, thin section rule
  'editorial',       // Center section titles, thin rules, generous whitespace
  'card',            // Hero content inside floating card
  'banner',          // Full-width hero strip, content in bottom band
  'spotlight',       // Very narrow hero column, high focus
  'asymmetric',      // Split with reversed columns, uneven grid
  'magazine',        // Left-aligned section titles, editorial feel
]);

export type LayoutId = z.infer<typeof layoutIdSchema>;

/**
 * Font tokens. We intentionally use tokens (not raw font-family strings) so the
 * frontend can safely map them to known font stacks and load them via a curated
 * Google Fonts URL.
 */
export const fontTokenSchema = z.enum([
  'inter',
  'playfair_display',
  'cormorant_garamond',
  'lora',
  'abril_fatface',
  'crimson_text',
  'oswald',
  'roboto_condensed',
  'dm_sans',
  'montserrat',
]);

export type FontToken = z.infer<typeof fontTokenSchema>;

export const headingTransformSchema = z.enum(['none', 'uppercase', 'small-caps']);
export type HeadingTransform = z.infer<typeof headingTransformSchema>;

export const dividerStyleSchema = z.enum(['line', 'ornament', 'dots', 'none']);
export type DividerStyle = z.infer<typeof dividerStyleSchema>;

export interface ShopStyleResolved {
  preset: StylePresetId;
  layout: LayoutId;
  headingFont: FontToken;
  bodyFont: FontToken;
  headingWeight: number;
  headingLetterSpacing: string;
  headingLineHeight: string;
  headingTransform: HeadingTransform;
  /** Radii are applied through existing global tokens: --radius-sm/md/lg/xl/2xl/full */
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  borderWidth: string;
  borderStyle: string;
  iconWeight: number;
  dividerStyle: DividerStyle;
}

/**
 * What we store in the shop theme JSON (alongside colors).
 * Keep overrides narrow and validated.
 */
export const shopStyleConfigSchema = z.object({
  preset: stylePresetIdSchema.default('modern'),
  layout: layoutIdSchema.optional(),
  headingFont: fontTokenSchema.optional(),
  bodyFont: fontTokenSchema.optional(),
  headingWeight: z.number().int().min(300).max(900).optional(),
  headingLetterSpacing: z.string().max(20).optional(),
  headingLineHeight: z.string().max(10).optional(),
  headingTransform: headingTransformSchema.optional(),
  iconWeight: z.number().int().min(100).max(700).optional(),
  dividerStyle: dividerStyleSchema.optional(),
}).default({});

export type ShopStyleConfig = z.infer<typeof shopStyleConfigSchema>;

/** Partial input for PATCH (all optional, used as `theme.style`). */
export const shopStyleInputSchema = z.object({
  preset: stylePresetIdSchema.optional(),
  layout: layoutIdSchema.optional(),
  headingFont: fontTokenSchema.optional(),
  bodyFont: fontTokenSchema.optional(),
  headingWeight: z.number().int().min(300).max(900).optional(),
  headingLetterSpacing: z.string().max(20).optional(),
  headingLineHeight: z.string().max(10).optional(),
  headingTransform: headingTransformSchema.optional(),
  iconWeight: z.number().int().min(100).max(700).optional(),
  dividerStyle: dividerStyleSchema.optional(),
}).optional();

export const DEFAULT_STYLE_PRESETS: Record<StylePresetId, Omit<ShopStyleResolved, 'preset' | 'layout'>> = {
  modern: {
    headingFont: 'playfair_display',
    bodyFont: 'inter',
    headingWeight: 600,
    headingLetterSpacing: '0em',
    headingLineHeight: '1.2',
    headingTransform: 'none',
    radius: { sm: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '28px', full: '100px' },
    borderWidth: '1px',
    borderStyle: 'solid',
    iconWeight: 300,
    dividerStyle: 'line',
  },
  classical: {
    headingFont: 'cormorant_garamond',
    bodyFont: 'lora',
    headingWeight: 600,
    headingLetterSpacing: '0.03em',
    headingLineHeight: '1.25',
    headingTransform: 'small-caps',
    radius: { sm: '6px', md: '10px', lg: '14px', xl: '20px', '2xl': '24px', full: '100px' },
    borderWidth: '1px',
    borderStyle: 'solid',
    iconWeight: 300,
    dividerStyle: 'ornament',
  },
  vintage: {
    headingFont: 'abril_fatface',
    bodyFont: 'crimson_text',
    headingWeight: 600,
    headingLetterSpacing: '0.08em',
    headingLineHeight: '1.25',
    headingTransform: 'uppercase',
    radius: { sm: '0px', md: '0px', lg: '0px', xl: '0px', '2xl': '0px', full: '100px' },
    borderWidth: '2px',
    borderStyle: 'double',
    iconWeight: 400,
    dividerStyle: 'dots',
  },
  luxury: {
    headingFont: 'playfair_display',
    bodyFont: 'montserrat',
    headingWeight: 600,
    headingLetterSpacing: '0.06em',
    headingLineHeight: '1.2',
    headingTransform: 'uppercase',
    radius: { sm: '2px', md: '4px', lg: '6px', xl: '10px', '2xl': '14px', full: '100px' },
    borderWidth: '1px',
    borderStyle: 'solid',
    iconWeight: 300,
    dividerStyle: 'ornament',
  },
  industrial: {
    headingFont: 'oswald',
    bodyFont: 'roboto_condensed',
    headingWeight: 600,
    headingLetterSpacing: '0.06em',
    headingLineHeight: '1.25',
    headingTransform: 'uppercase',
    radius: { sm: '0px', md: '0px', lg: '2px', xl: '6px', '2xl': '10px', full: '100px' },
    borderWidth: '2px',
    borderStyle: 'solid',
    iconWeight: 500,
    dividerStyle: 'line',
  },
  minimal: {
    headingFont: 'dm_sans',
    bodyFont: 'dm_sans',
    headingWeight: 600,
    headingLetterSpacing: '0.01em',
    headingLineHeight: '1.2',
    headingTransform: 'none',
    radius: { sm: '10px', md: '14px', lg: '18px', xl: '26px', '2xl': '32px', full: '100px' },
    borderWidth: '1px',
    borderStyle: 'solid',
    iconWeight: 200,
    dividerStyle: 'none',
  },
};

export function resolveShopStyle(config: ShopStyleConfig): ShopStyleResolved {
  const preset = config.preset ?? 'modern';
  const layout = config.layout ?? 'centered';
  const base = DEFAULT_STYLE_PRESETS[preset];
  return {
    preset,
    layout,
    headingFont: config.headingFont ?? base.headingFont,
    bodyFont: config.bodyFont ?? base.bodyFont,
    headingWeight: config.headingWeight ?? base.headingWeight,
    headingLetterSpacing: config.headingLetterSpacing ?? base.headingLetterSpacing,
    headingLineHeight: config.headingLineHeight ?? base.headingLineHeight,
    headingTransform: config.headingTransform ?? base.headingTransform,
    radius: base.radius,
    borderWidth: base.borderWidth,
    borderStyle: base.borderStyle,
    iconWeight: config.iconWeight ?? base.iconWeight,
    dividerStyle: config.dividerStyle ?? base.dividerStyle,
  };
}

