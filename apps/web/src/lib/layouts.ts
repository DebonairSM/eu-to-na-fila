import type { LayoutId, StylePresetId } from '@eutonafila/shared';

export interface LayoutBehavior {
  /** Two-column hero with decorative block on the right */
  heroSplit: boolean;
  /** Bordered frame around hero content */
  heroFrame: boolean;
  /** Hero content inside a floating card (distinct from frame) */
  heroCard: boolean;
  /** Full-width hero strip with content in a bottom band */
  heroBanner: boolean;
  /** Very narrow hero column (spotlight) */
  heroNarrow: boolean;
  /** Split hero with reversed column order and uneven grid */
  heroAsymmetric: boolean;
  /** Badge style: pill (default), label (double border), minimal (text-only) */
  badgeStyle: 'pill' | 'label' | 'minimal';
  /** Show decorative icon block in hero */
  showDecorativeBlock: boolean;
  /** Gradient overlay on hero (luxury feel) */
  heroOverlay: boolean;
  /** CTA buttons without icons (text only) */
  ctaTextOnly: boolean;
  /** Section title decoration: none, line (thin rule), block (thick underline) */
  sectionTitleStyle: 'none' | 'line' | 'block';
  /** Section title alignment (magazine = left) */
  sectionTitleAlign: 'center' | 'left';
  /** About section image frame: none, border, double, shadow, sharp */
  aboutImageFrame: 'none' | 'border' | 'double' | 'shadow' | 'sharp';
  /** Page section order: default (About then Location) or aboutLast (Location then About) */
  sectionOrder: 'default' | 'aboutLast';
  /** About section right column: image, location content, or none (single column) */
  aboutRightColumn: 'image' | 'location' | 'none';
}

export const LAYOUT_BEHAVIORS: Record<LayoutId, LayoutBehavior> = {
  centered: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'none',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  centered_frame: {
    heroSplit: false,
    heroFrame: true,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'border',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  split: {
    heroSplit: true,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: true,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'none',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  minimal: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'minimal',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: true,
    sectionTitleStyle: 'none',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'none',
  },
  luxury: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: true,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'shadow',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  bold: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'block',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'sharp',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'none',
  },
  classic: {
    heroSplit: false,
    heroFrame: true,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'label',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'double',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  editorial: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'location',
  },
  card: {
    heroSplit: false,
    heroFrame: false,
    heroCard: true,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'shadow',
    sectionOrder: 'default',
    aboutRightColumn: 'location',
  },
  banner: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: true,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'minimal',
    showDecorativeBlock: false,
    heroOverlay: true,
    ctaTextOnly: true,
    sectionTitleStyle: 'none',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'none',
  },
  spotlight: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: true,
    heroAsymmetric: false,
    badgeStyle: 'minimal',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: true,
    sectionTitleStyle: 'none',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'none',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'none',
  },
  asymmetric: {
    heroSplit: true,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: true,
    badgeStyle: 'label',
    showDecorativeBlock: true,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'block',
    sectionTitleAlign: 'center',
    aboutImageFrame: 'sharp',
    sectionOrder: 'default',
    aboutRightColumn: 'image',
  },
  magazine: {
    heroSplit: false,
    heroFrame: false,
    heroCard: false,
    heroBanner: false,
    heroNarrow: false,
    heroAsymmetric: false,
    badgeStyle: 'minimal',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: true,
    sectionTitleStyle: 'line',
    sectionTitleAlign: 'left',
    aboutImageFrame: 'border',
    sectionOrder: 'aboutLast',
    aboutRightColumn: 'none',
  },
};

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  centered: 'Centrado',
  centered_frame: 'Centrado com moldura',
  split: 'Dividido',
  minimal: 'Mínimo',
  luxury: 'Luxo',
  bold: 'Em destaque',
  classic: 'Clássico',
  editorial: 'Editorial',
  card: 'Cartão',
  banner: 'Faixa',
  spotlight: 'Destaque',
  asymmetric: 'Assimétrico',
  magazine: 'Revista',
};

export function getLayoutBehavior(layout: LayoutId): LayoutBehavior {
  return LAYOUT_BEHAVIORS[layout];
}

/**
 * Layouts recommended for each style preset to reinforce the intended feeling.
 * Shown in the layout selector so users can pick a layout that fits the architecture.
 */
export const PRESET_RECOMMENDED_LAYOUTS: Record<StylePresetId, LayoutId[]> = {
  modern: ['centered', 'split', 'card', 'minimal', 'editorial'],
  classical: ['centered_frame', 'classic', 'editorial', 'magazine'],
  vintage: ['split', 'asymmetric', 'classic', 'centered_frame'],
  luxury: ['luxury', 'banner', 'centered_frame', 'card'],
  industrial: ['bold', 'asymmetric', 'split', 'spotlight'],
  minimal: ['minimal', 'spotlight', 'editorial', 'magazine'],
};

export function isLayoutRecommendedForPreset(preset: StylePresetId, layout: LayoutId): boolean {
  return PRESET_RECOMMENDED_LAYOUTS[preset].includes(layout);
}
