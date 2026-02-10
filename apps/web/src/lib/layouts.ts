import type { LayoutId, StylePresetId } from '@eutonafila/shared';

export interface LayoutBehavior {
  /** Two-column hero with decorative block on the right */
  heroSplit: boolean;
  /** Bordered frame around hero content */
  heroFrame: boolean;
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
  /** About section image frame: none, border, double, shadow, sharp */
  aboutImageFrame: 'none' | 'border' | 'double' | 'shadow' | 'sharp';
}

export const LAYOUT_BEHAVIORS: Record<LayoutId, LayoutBehavior> = {
  centered: {
    heroSplit: false,
    heroFrame: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'none',
    aboutImageFrame: 'none',
  },
  centered_frame: {
    heroSplit: false,
    heroFrame: true,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    aboutImageFrame: 'border',
  },
  split: {
    heroSplit: true,
    heroFrame: false,
    badgeStyle: 'pill',
    showDecorativeBlock: true,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'none',
    aboutImageFrame: 'none',
  },
  minimal: {
    heroSplit: false,
    heroFrame: false,
    badgeStyle: 'minimal',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: true,
    sectionTitleStyle: 'none',
    aboutImageFrame: 'none',
  },
  luxury: {
    heroSplit: false,
    heroFrame: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: true,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    aboutImageFrame: 'shadow',
  },
  bold: {
    heroSplit: false,
    heroFrame: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'block',
    aboutImageFrame: 'sharp',
  },
  classic: {
    heroSplit: false,
    heroFrame: true,
    badgeStyle: 'label',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    aboutImageFrame: 'border',
  },
  editorial: {
    heroSplit: false,
    heroFrame: false,
    badgeStyle: 'pill',
    showDecorativeBlock: false,
    heroOverlay: false,
    ctaTextOnly: false,
    sectionTitleStyle: 'line',
    aboutImageFrame: 'none',
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
};

export function getLayoutBehavior(layout: LayoutId): LayoutBehavior {
  return LAYOUT_BEHAVIORS[layout];
}

/**
 * Layouts recommended for each style preset to reinforce the intended feeling.
 * Shown in the layout selector so users can pick a layout that fits the architecture.
 */
export const PRESET_RECOMMENDED_LAYOUTS: Record<StylePresetId, LayoutId[]> = {
  modern: ['centered', 'split', 'minimal', 'editorial'],
  classical: ['centered_frame', 'classic', 'editorial'],
  vintage: ['split', 'classic', 'centered_frame'],
  luxury: ['luxury', 'centered_frame', 'classic'],
  industrial: ['bold', 'split', 'centered'],
  minimal: ['minimal', 'editorial', 'centered'],
};

export function isLayoutRecommendedForPreset(preset: StylePresetId, layout: LayoutId): boolean {
  return PRESET_RECOMMENDED_LAYOUTS[preset].includes(layout);
}
