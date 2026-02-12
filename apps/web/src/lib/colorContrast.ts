/**
 * Color contrast utilities for WCAG readability checks.
 * Used by scripts and optionally by UI to validate theme color sets.
 */

/** [r, g, b] or [r, g, b, a] with components 0–1. Alpha default 1 for opaque. */
export type Rgba = [number, number, number, number];

/** Parse hex (#fff, #ffffff), rgb(r,g,b), rgba(r,g,b,a) to sRGB [0-1] and alpha [0-1]. */
export function parseColorToRgba(cssColor: string): Rgba | null {
  const s = cssColor.trim();

  const hex3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(s);
  if (hex3) {
    return [
      parseInt(hex3[1] + hex3[1], 16) / 255,
      parseInt(hex3[2] + hex3[2], 16) / 255,
      parseInt(hex3[3] + hex3[3], 16) / 255,
      1,
    ];
  }

  const hex6 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(s);
  if (hex6) {
    return [
      parseInt(hex6[1], 16) / 255,
      parseInt(hex6[2], 16) / 255,
      parseInt(hex6[3], 16) / 255,
      1,
    ];
  }

  const rgbMatch = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(s);
  if (rgbMatch) {
    return [
      Math.min(255, parseInt(rgbMatch[1], 10)) / 255,
      Math.min(255, parseInt(rgbMatch[2], 10)) / 255,
      Math.min(255, parseInt(rgbMatch[3], 10)) / 255,
      1,
    ];
  }

  const rgbaMatch = /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(s);
  if (rgbaMatch) {
    const a = Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])));
    return [
      Math.min(255, parseInt(rgbaMatch[1], 10)) / 255,
      Math.min(255, parseInt(rgbaMatch[2], 10)) / 255,
      Math.min(255, parseInt(rgbaMatch[3], 10)) / 255,
      a,
    ];
  }

  return null;
}

/** Backward-compat: returns [r,g,b] or null; alpha is ignored. */
export function parseColorToRgb(cssColor: string): [number, number, number] | null {
  const rgba = parseColorToRgba(cssColor);
  return rgba ? [rgba[0], rgba[1], rgba[2]] : null;
}

/** Blend foreground over background (alpha compositing). All sRGB 0–1. */
export function blendOver(fg: Rgba, bg: [number, number, number]): [number, number, number] {
  const a = fg[3];
  if (a >= 1) return [fg[0], fg[1], fg[2]];
  if (a <= 0) return [...bg];
  return [
    fg[0] * a + bg[0] * (1 - a),
    fg[1] * a + bg[1] * (1 - a),
    fg[2] * a + bg[2] * (1 - a),
  ];
}

/** Relative luminance (WCAG). Input: sRGB components 0–1. */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Contrast ratio (WCAG 2.1). Returns value >= 1. */
export function contrastRatio(lum1: number, lum2: number): number {
  const L1 = Math.max(lum1, lum2);
  const L2 = Math.min(lum1, lum2);
  return (L1 + 0.05) / (L2 + 0.05);
}

/** Contrast ratio for two CSS color strings. If foreground is rgba(), it is blended over background first. Returns null if either color is unparseable. */
export function getContrastRatio(foreground: string, background: string): number | null {
  const fg = parseColorToRgba(foreground);
  const bg = parseColorToRgba(background);
  if (!fg || !bg) return null;
  const bgRgb: [number, number, number] = [bg[0], bg[1], bg[2]];
  const effectiveFg = fg[3] < 1 ? blendOver(fg, bgRgb) : [fg[0], fg[1], fg[2]];
  const L1 = relativeLuminance(effectiveFg[0], effectiveFg[1], effectiveFg[2]);
  const L2 = relativeLuminance(bgRgb[0], bgRgb[1], bgRgb[2]);
  return contrastRatio(L1, L2);
}

/** WCAG 2.1 AA normal text: 4.5:1. AA large text: 3:1. */
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AAA_NORMAL = 7;

export function meetsWCAGAA(ratio: number, largeText = false): boolean {
  return ratio >= (largeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
}
