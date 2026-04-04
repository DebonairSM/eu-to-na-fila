export type ClientContext = 'web' | 'kiosk' | 'company_admin' | 'unknown';

const ALLOWED_CLIENT_CONTEXTS: ReadonlySet<string> = new Set([
  'web',
  'kiosk',
  'company_admin',
  'unknown',
]);

function normalizeHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').trim().toLowerCase();
  return (value ?? '').trim().toLowerCase();
}

function getHeaderCaseInsensitive(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | string[] | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

export function resolveClientContext(
  headers: Record<string, string | string[] | undefined>,
  rawUrl: string
): ClientContext {
  const headerValue = normalizeHeaderValue(getHeaderCaseInsensitive(headers, 'x-client-context'));
  if (headerValue && ALLOWED_CLIENT_CONTEXTS.has(headerValue)) {
    return headerValue as ClientContext;
  }

  const pathOnly = (rawUrl ?? '').split('?')[0] ?? '';
  if (pathOnly.startsWith('/api/companies/')) return 'company_admin';
  if (pathOnly.startsWith('/api/shops/')) return 'web';
  return 'unknown';
}
