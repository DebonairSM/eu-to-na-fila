/**
 * Checks that all shop theme color sets (default + preset palettes) meet
 * WCAG AA contrast for readability (text on backgrounds, text on accent).
 *
 * Run from repo root: pnpm --filter web exec tsx scripts/check-theme-contrast.ts
 * Or from apps/web: pnpm exec tsx scripts/check-theme-contrast.ts
 */

import { DEFAULT_THEME } from '@eutonafila/shared';
import { getContrastRatio, WCAG_AA_NORMAL, WCAG_AAA_NORMAL } from '../src/lib/colorContrast';
import { PRESET_PALETTES } from '../src/lib/presetPalettes';

type ThemeLike = {
  background?: string;
  surfacePrimary?: string;
  surfaceSecondary?: string;
  navBg?: string;
  textPrimary?: string;
  textSecondary?: string;
  textOnAccent?: string;
  accent?: string;
};

const MIN_RATIO_NORMAL = WCAG_AA_NORMAL; // 4.5:1 for normal text
const MIN_RATIO_ACCENT = WCAG_AA_NORMAL; // 4.5:1 for text on accent (buttons/CTAs)
const MIN_RATIO_SECONDARY = WCAG_AAA_NORMAL; // 7:1 for secondary text (improved readability)

interface ContrastPair {
  name: string;
  fg: string;
  bg: string;
  minRatio: number;
}

function getPairs(theme: ThemeLike): ContrastPair[] {
  const tp = theme.textPrimary ?? '#ffffff';
  const ts = theme.textSecondary ?? 'rgba(255,255,255,0.7)';
  const toa = theme.textOnAccent ?? '#0a0a0a';
  const bg = theme.background ?? '#0a0a0a';
  const sp = theme.surfacePrimary ?? theme.background ?? '#0a0a0a';
  const ss = theme.surfaceSecondary ?? '#1a1a1a';
  const nav = theme.navBg ?? theme.background ?? '#0a0a0a';
  const accent = theme.accent ?? '#D4AF37';

  return [
    { name: 'textPrimary on background', fg: tp, bg, minRatio: MIN_RATIO_NORMAL },
    { name: 'textPrimary on surfacePrimary', fg: tp, bg: sp, minRatio: MIN_RATIO_NORMAL },
    { name: 'textPrimary on surfaceSecondary', fg: tp, bg: ss, minRatio: MIN_RATIO_NORMAL },
    { name: 'textPrimary on navBg', fg: tp, bg: nav, minRatio: MIN_RATIO_NORMAL },
    { name: 'textSecondary on background', fg: ts, bg, minRatio: MIN_RATIO_SECONDARY },
    { name: 'textSecondary on surfacePrimary', fg: ts, bg: sp, minRatio: MIN_RATIO_SECONDARY },
    { name: 'textSecondary on surfaceSecondary', fg: ts, bg: ss, minRatio: MIN_RATIO_SECONDARY },
    { name: 'textSecondary on navBg', fg: ts, bg: nav, minRatio: MIN_RATIO_SECONDARY },
    { name: 'textOnAccent on accent', fg: toa, bg: accent, minRatio: MIN_RATIO_ACCENT },
  ];
}

function checkTheme(name: string, theme: ThemeLike): { name: string; failures: string[] } {
  const pairs = getPairs(theme);
  const failures: string[] = [];

  for (const p of pairs) {
    const ratio = getContrastRatio(p.fg, p.bg);
    if (ratio == null) {
      failures.push(`${p.name}: could not parse color(s)`);
      continue;
    }
    const required = p.minRatio;
    if (ratio < required) {
      failures.push(`${p.name}: ${ratio.toFixed(2)}:1 (need ${required}:1)`);
    }
  }

  return { name, failures };
}

function main(): void {
  const results: { name: string; failures: string[] }[] = [];

  results.push(checkTheme('Default theme', DEFAULT_THEME as ThemeLike));

  for (const [presetId, palettes] of Object.entries(PRESET_PALETTES)) {
    for (let i = 0; i < palettes.length; i++) {
      const p = palettes[i];
      results.push(
        checkTheme(`${presetId} / ${p.label}`, p.theme)
      );
    }
  }

  const failed = results.filter((r) => r.failures.length > 0);
  const passed = results.filter((r) => r.failures.length === 0);

  if (failed.length > 0) {
    console.error('Theme contrast check failed.\n');
    for (const r of failed) {
      console.error(`  ${r.name}`);
      for (const f of r.failures) console.error(`    - ${f}`);
      console.error('');
    }
    console.error(`Failed: ${failed.length}, Passed: ${passed.length}`);
    process.exit(1);
  }

  console.log(`All ${results.length} theme set(s) meet WCAG AA readability.`);
}

main();
