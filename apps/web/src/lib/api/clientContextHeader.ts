export function getWebClientContextHeaderValue(): 'web' | 'kiosk' | 'company_admin' {
  if (typeof window === 'undefined') return 'web';

  const path = window.location.pathname ?? '';
  if (path === '/company' || path.startsWith('/company/')) {
    return 'company_admin';
  }

  const search = window.location.search ?? '';
  const isKiosk = new URLSearchParams(search).get('kiosk') === 'true';
  if (isKiosk) return 'kiosk';

  return 'web';
}
