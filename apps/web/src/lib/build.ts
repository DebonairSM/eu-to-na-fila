/**
 * Determines if the current build is the root marketing site build
 * (as opposed to the barbershop app build).
 *
 * Root build uses base URL "/". Barbershop may use /mineiro/, /projects/mineiro/, or other path.
 * We check the actual pathname first (most reliable), then fall back to BASE_URL.
 */
export function isRootBuild(): boolean {
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/company')) return true;
    if (pathname === '/' || pathname === '/projects' || pathname === '/about' || pathname === '/contact') return true;
    if (pathname.startsWith('/projects/')) return false;
    // Single-segment path (e.g. /mineiro, /shops) = barbershop
    if (/^\/[^/]+\/?$/.test(pathname)) return false;
  }
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  return baseUrl === '/' || baseUrl === '';
}
