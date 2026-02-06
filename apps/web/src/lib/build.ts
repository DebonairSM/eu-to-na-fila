/**
 * Determines if the current build is the root marketing site build
 * (as opposed to the Mineiro app build).
 * 
 * The root build uses base URL "/" while the Mineiro build uses "/projects/mineiro/".
 * 
 * We check the actual pathname first (most reliable), then fall back to BASE_URL.
 */
export function isRootBuild(): boolean {
  // First check the actual pathname - most reliable at runtime
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    // If pathname starts with /projects/mineiro, definitely the Mineiro build
    if (pathname.startsWith('/projects/mineiro')) {
      return false;
    }
    // If pathname doesn't start with /projects/mineiro and we're on a /company/* route,
    // assume root build (since both builds can have /company routes, but
    // only root build should show root styling)
    if (pathname.startsWith('/company')) {
      return true;
    }
  }
  
  // Fallback: Check BASE_URL from Vite config
  const baseUrl = import.meta.env.BASE_URL ?? '/';
  return baseUrl === '/' || baseUrl === '';
}
