import { describe, expect, it } from 'vitest';
import { resolveClientContext } from './clientContext.js';

describe('resolveClientContext', () => {
  it('accepts valid header values (case-insensitive key + value)', () => {
    const result = resolveClientContext(
      { 'X-Client-Context': 'KIOSK' },
      '/api/shops/foo/queue'
    );
    expect(result).toBe('kiosk');
  });

  it('lets valid header override inferred path context', () => {
    const result = resolveClientContext(
      { 'x-client-context': 'company_admin' },
      '/api/shops/foo/queue'
    );
    expect(result).toBe('company_admin');
  });

  it('falls back to path inference when header is invalid', () => {
    const result = resolveClientContext(
      { 'x-client-context': 'mobile_app' },
      '/api/shops/foo/queue'
    );
    expect(result).toBe('web');
  });

  it('infers company admin traffic from /api/companies path', () => {
    const result = resolveClientContext({}, '/api/companies/3/usage?days=30');
    expect(result).toBe('company_admin');
  });

  it('returns unknown for non-company/non-shop API paths', () => {
    const result = resolveClientContext({}, '/api/auth/login');
    expect(result).toBe('unknown');
  });
});
