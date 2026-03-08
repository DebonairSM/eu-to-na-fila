import { useState, useEffect } from 'react';

/**
 * Match a media query (e.g. (max-width: 639px) for mobile).
 * Updates when the window is resized.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatches(m.matches);
    setMatches(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** True when viewport is below Tailwind sm (640px). */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
