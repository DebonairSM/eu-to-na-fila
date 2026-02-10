/**
 * Material Symbols font-face injection.
 *
 * We inject this at runtime to ensure the font URL respects Vite's base URL
 * (`import.meta.env.BASE_URL`) instead of hardcoding a specific shop path.
 */
export function ensureMaterialSymbolsFontFace(): void {
  if (typeof document === 'undefined') return;
  const id = 'material-symbols-font-face';
  if (document.getElementById(id)) return;

  const parts = window.location.pathname.split('/').filter(Boolean);
  const scope = (parts[0] === 'projects' && parts[1]) ? `/projects/${parts[1]}/` : ((import.meta as any).env?.BASE_URL ?? '/');
  const url = `${String(scope).endsWith('/') ? scope : `${scope}/`}fonts/MaterialSymbolsOutlined.ttf`;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  src: url('${url}') format('truetype');
  font-display: swap;
}
  `.trim();
  document.head.appendChild(style);
}

