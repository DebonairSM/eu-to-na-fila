/**
 * Material Symbols font-face injection.
 * In dev, Vite serves public from root so we use /fonts/... In production, we use BASE_URL
 * so the font is found when the app is deployed under a path (e.g. /projects/mineiro/).
 */
export function ensureMaterialSymbolsFontFace(): void {
  if (typeof document === 'undefined') return;
  const id = 'material-symbols-font-face';
  if (document.getElementById(id)) return;

  const base = (import.meta as any).env?.BASE_URL ?? '/';
  const fontPath = (import.meta as any).env?.DEV
    ? '/fonts/MaterialSymbolsOutlined.ttf'
    : `${base.endsWith('/') ? base : `${base}/`}fonts/MaterialSymbolsOutlined.ttf`;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  src: url('${fontPath}') format('truetype');
  font-display: swap;
}
  `.trim();
  document.head.appendChild(style);
}

