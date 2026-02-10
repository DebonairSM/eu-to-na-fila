import type { StylePresetId } from '@eutonafila/shared';

/** Full theme (all color fields) plus a display label for the suggestion chip. */
export interface PresetPalette {
  label: string;
  theme: {
    primary: string;
    accent: string;
    background: string;
    surfacePrimary: string;
    surfaceSecondary: string;
    navBg: string;
    textPrimary: string;
    textSecondary: string;
    borderColor: string;
    textOnAccent: string;
    accentHover: string;
  };
}

/** Science/industry-aligned color palettes per architectural style. 4–6 sets per preset. */
export const PRESET_PALETTES: Record<StylePresetId, PresetPalette[]> = {
  modern: [
    { label: 'Charcoal e destaque', theme: { primary: '#1a1a1a', accent: '#2563eb', background: '#0f0f0f', surfacePrimary: '#141414', surfaceSecondary: '#1e1e1e', navBg: '#0f0f0f', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.75)', borderColor: 'rgba(250,250,250,0.1)', textOnAccent: '#ffffff', accentHover: '#3b82f6' } },
    { label: 'Neutro e accent', theme: { primary: '#262626', accent: '#0ea5e9', background: '#0a0a0a', surfacePrimary: '#171717', surfaceSecondary: '#262626', navBg: '#0a0a0a', textPrimary: '#f5f5f5', textSecondary: 'rgba(245,245,245,0.7)', borderColor: 'rgba(255,255,255,0.08)', textOnAccent: '#0a0a0a', accentHover: '#38bdf8' } },
    { label: 'Escuro e verde', theme: { primary: '#14532d', accent: '#22c55e', background: '#0c0c0c', surfacePrimary: '#0f0f0f', surfaceSecondary: '#1a1a1a', navBg: '#0c0c0c', textPrimary: '#f0fdf4', textSecondary: 'rgba(240,253,244,0.7)', borderColor: 'rgba(255,255,255,0.08)', textOnAccent: '#0c0c0c', accentHover: '#4ade80' } },
    { label: 'Muted e coral', theme: { primary: '#292524', accent: '#f97316', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#fafaf9', textSecondary: 'rgba(250,250,249,0.7)', borderColor: 'rgba(255,255,255,0.08)', textOnAccent: '#1c1917', accentHover: '#fb923c' } },
    { label: 'Preto e branco', theme: { primary: '#171717', accent: '#ffffff', background: '#000000', surfacePrimary: '#0a0a0a', surfaceSecondary: '#171717', navBg: '#000000', textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.75)', borderColor: 'rgba(255,255,255,0.12)', textOnAccent: '#000000', accentHover: '#e5e5e5' } },
  ],
  classical: [
    { label: 'Bordô e creme', theme: { primary: '#7f1d1d', accent: '#D4AF37', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#fef3c7', textSecondary: 'rgba(254,243,199,0.8)', borderColor: 'rgba(212,175,55,0.25)', textOnAccent: '#1c1917', accentHover: '#E8C547' } },
    { label: 'Verde e brass', theme: { primary: '#14532d', accent: '#b45309', background: '#0f172a', surfacePrimary: '#1e293b', surfaceSecondary: '#334155', navBg: '#0f172a', textPrimary: '#fefce8', textSecondary: 'rgba(254,252,232,0.75)', borderColor: 'rgba(180,83,9,0.3)', textOnAccent: '#fefce8', accentHover: '#d97706' } },
    { label: 'Marrom e dourado', theme: { primary: '#422006', accent: '#ca8a04', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#57534e', navBg: '#1c1917', textPrimary: '#fef9c3', textSecondary: 'rgba(254,249,195,0.8)', borderColor: 'rgba(202,138,4,0.3)', textOnAccent: '#1c1917', accentHover: '#eab308' } },
    { label: 'Navy e ouro', theme: { primary: '#1e3a5f', accent: '#D4AF37', background: '#0f172a', surfacePrimary: '#1e293b', surfaceSecondary: '#334155', navBg: '#0f172a', textPrimary: '#f8fafc', textSecondary: 'rgba(248,250,252,0.75)', borderColor: 'rgba(212,175,55,0.2)', textOnAccent: '#0f172a', accentHover: '#E8C547' } },
    { label: 'Sépia tradicional', theme: { primary: '#78350f', accent: '#a16207', background: '#292524', surfacePrimary: '#44403c', surfaceSecondary: '#57534e', navBg: '#292524', textPrimary: '#fffbeb', textSecondary: 'rgba(255,251,235,0.8)', borderColor: 'rgba(161,98,7,0.35)', textOnAccent: '#fffbeb', accentHover: '#ca8a04' } },
  ],
  vintage: [
    { label: 'Sépia e marrom', theme: { primary: '#44403c', accent: '#78716c', background: '#fef3c7', surfacePrimary: '#fef9c3', surfaceSecondary: '#fef08a', navBg: '#fef3c7', textPrimary: '#292524', textSecondary: 'rgba(41,37,36,0.75)', borderColor: 'rgba(120,113,108,0.4)', textOnAccent: '#fef3c7', accentHover: '#a8a29e' } },
    { label: 'Verde vintage', theme: { primary: '#365314', accent: '#4d7c0f', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#ecfccb', textSecondary: 'rgba(236,252,203,0.8)', borderColor: 'rgba(77,124,15,0.35)', textOnAccent: '#1c1917', accentHover: '#65a30d' } },
    { label: 'Creme e castanho', theme: { primary: '#422006', accent: '#713f12', background: '#fefce8', surfacePrimary: '#fef9c3', surfaceSecondary: '#fef08a', navBg: '#fefce8', textPrimary: '#292524', textSecondary: 'rgba(41,37,36,0.7)', borderColor: 'rgba(113,63,18,0.35)', textOnAccent: '#fefce8', accentHover: '#854d0e' } },
    { label: 'Papel envelhecido', theme: { primary: '#57534e', accent: '#78716c', background: '#f5f5f4', surfacePrimary: '#e7e5e4', surfaceSecondary: '#d6d3d1', navBg: '#f5f5f4', textPrimary: '#1c1917', textSecondary: 'rgba(28,25,23,0.75)', borderColor: 'rgba(120,113,108,0.35)', textOnAccent: '#f5f5f4', accentHover: '#a8a29e' } },
    { label: 'Âmbar escuro', theme: { primary: '#451a03', accent: '#b45309', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#fffbeb', textSecondary: 'rgba(255,251,235,0.8)', borderColor: 'rgba(180,83,9,0.3)', textOnAccent: '#fffbeb', accentHover: '#d97706' } },
  ],
  luxury: [
    { label: 'Ouro e preto', theme: { primary: '#0a0a0a', accent: '#D4AF37', background: '#0a0a0a', surfacePrimary: '#0a0a0a', surfaceSecondary: '#171717', navBg: '#0a0a0a', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.75)', borderColor: 'rgba(212,175,55,0.2)', textOnAccent: '#0a0a0a', accentHover: '#E8C547' } },
    { label: 'Champanhe', theme: { primary: '#1c1917', accent: '#fef3c7', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#fef9c3', textSecondary: 'rgba(254,249,195,0.8)', borderColor: 'rgba(254,243,199,0.25)', textOnAccent: '#1c1917', accentHover: '#fef08a' } },
    { label: 'Navy e prata', theme: { primary: '#0f172a', accent: '#cbd5e1', background: '#0f172a', surfacePrimary: '#1e293b', surfaceSecondary: '#334155', navBg: '#0f172a', textPrimary: '#f1f5f9', textSecondary: 'rgba(241,245,249,0.8)', borderColor: 'rgba(203,213,225,0.2)', textOnAccent: '#0f172a', accentHover: '#e2e8f0' } },
    { label: 'Bordô luxo', theme: { primary: '#450a0a', accent: '#fbbf24', background: '#1c1917', surfacePrimary: '#292524', surfaceSecondary: '#44403c', navBg: '#1c1917', textPrimary: '#fef3c7', textSecondary: 'rgba(254,243,199,0.8)', borderColor: 'rgba(251,191,36,0.25)', textOnAccent: '#450a0a', accentHover: '#fcd34d' } },
    { label: 'Preto e brass', theme: { primary: '#000000', accent: '#b45309', background: '#000000', surfacePrimary: '#0a0a0a', surfaceSecondary: '#171717', navBg: '#000000', textPrimary: '#fafaf9', textSecondary: 'rgba(250,250,249,0.75)', borderColor: 'rgba(180,83,9,0.3)', textOnAccent: '#fafaf9', accentHover: '#d97706' } },
  ],
  industrial: [
    { label: 'Concreto e laranja', theme: { primary: '#27272a', accent: '#ea580c', background: '#18181b', surfacePrimary: '#27272a', surfaceSecondary: '#3f3f46', navBg: '#18181b', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.75)', borderColor: 'rgba(255,255,255,0.12)', textOnAccent: '#fafafa', accentHover: '#f97316' } },
    { label: 'Preto e amarelo', theme: { primary: '#0a0a0a', accent: '#eab308', background: '#0a0a0a', surfacePrimary: '#171717', surfaceSecondary: '#262626', navBg: '#0a0a0a', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.75)', borderColor: 'rgba(234,179,8,0.3)', textOnAccent: '#0a0a0a', accentHover: '#facc15' } },
    { label: 'Metal e destaque', theme: { primary: '#3f3f46', accent: '#06b6d4', background: '#27272a', surfacePrimary: '#3f3f46', surfaceSecondary: '#52525b', navBg: '#27272a', textPrimary: '#f4f4f5', textSecondary: 'rgba(244,244,245,0.75)', borderColor: 'rgba(255,255,255,0.1)', textOnAccent: '#27272a', accentHover: '#22d3ee' } },
    { label: 'Grafite', theme: { primary: '#171717', accent: '#f97316', background: '#0a0a0a', surfacePrimary: '#262626', surfaceSecondary: '#404040', navBg: '#0a0a0a', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.7)', borderColor: 'rgba(255,255,255,0.1)', textOnAccent: '#0a0a0a', accentHover: '#fb923c' } },
    { label: 'Branco e preto', theme: { primary: '#fafafa', accent: '#000000', background: '#fafafa', surfacePrimary: '#f5f5f5', surfaceSecondary: '#e5e5e5', navBg: '#fafafa', textPrimary: '#171717', textSecondary: 'rgba(23,23,23,0.75)', borderColor: 'rgba(0,0,0,0.15)', textOnAccent: '#fafafa', accentHover: '#262626' } },
  ],
  minimal: [
    { label: 'Quase monocromático', theme: { primary: '#262626', accent: '#737373', background: '#0a0a0a', surfacePrimary: '#171717', surfaceSecondary: '#262626', navBg: '#0a0a0a', textPrimary: '#fafafa', textSecondary: 'rgba(250,250,250,0.65)', borderColor: 'rgba(255,255,255,0.08)', textOnAccent: '#fafafa', accentHover: '#a3a3a3' } },
    { label: 'Branco e cinza', theme: { primary: '#f5f5f5', accent: '#525252', background: '#ffffff', surfacePrimary: '#fafafa', surfaceSecondary: '#f5f5f5', navBg: '#ffffff', textPrimary: '#171717', textSecondary: 'rgba(23,23,23,0.7)', borderColor: 'rgba(0,0,0,0.1)', textOnAccent: '#ffffff', accentHover: '#737373' } },
    { label: 'Preto e branco', theme: { primary: '#0a0a0a', accent: '#ffffff', background: '#0a0a0a', surfacePrimary: '#171717', surfaceSecondary: '#262626', navBg: '#0a0a0a', textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)', textOnAccent: '#0a0a0a', accentHover: '#e5e5e5' } },
    { label: 'Accent suave', theme: { primary: '#1c1917', accent: '#94a3b8', background: '#0f172a', surfacePrimary: '#1e293b', surfaceSecondary: '#334155', navBg: '#0f172a', textPrimary: '#f1f5f9', textSecondary: 'rgba(241,245,249,0.75)', borderColor: 'rgba(148,163,184,0.2)', textOnAccent: '#0f172a', accentHover: '#b8c5d6' } },
    { label: 'Off-white', theme: { primary: '#fafaf9', accent: '#78716c', background: '#fafaf9', surfacePrimary: '#f5f5f4', surfaceSecondary: '#e7e5e4', navBg: '#fafaf9', textPrimary: '#1c1917', textSecondary: 'rgba(28,25,23,0.7)', borderColor: 'rgba(0,0,0,0.08)', textOnAccent: '#fafaf9', accentHover: '#a8a29e' } },
  ],
};

/**
 * Pick up to 3 random palette indices for a preset (no duplicate indices).
 * Used to show "three suggestion chips" with optional re-roll.
 */
export function pickThreeRandomPaletteIndices(preset: StylePresetId): [number, number, number] {
  const list = PRESET_PALETTES[preset];
  const n = list.length;
  if (n <= 3) {
    const arr = [...Array(n).keys()];
    while (arr.length < 3) arr.push(0);
    return [arr[0], arr[1], arr[2]];
  }
  const indices: number[] = [];
  while (indices.length < 3) {
    const i = Math.floor(Math.random() * n);
    if (!indices.includes(i)) indices.push(i);
  }
  return [indices[0], indices[1], indices[2]];
}
