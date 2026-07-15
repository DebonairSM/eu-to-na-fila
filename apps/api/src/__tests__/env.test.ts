import { describe, expect, it } from 'vitest';
import { DEVELOPMENT_JWT_SECRET, parseEnv } from '../env.js';

describe('environment JWT secret validation', () => {
  it('rejects a missing JWT_SECRET in production', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(
      /JWT_SECRET is required in production/
    );
  });

  it('rejects the documented development placeholder in production', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'production', JWT_SECRET: DEVELOPMENT_JWT_SECRET })
    ).toThrow(/must not use the development placeholder/);
  });

  it('accepts a strong non-placeholder production secret', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'production-only-secret-with-more-than-thirty-two-characters',
    });

    expect(parsed.JWT_SECRET).toBe(
      'production-only-secret-with-more-than-thirty-two-characters'
    );
  });

  it.each(['development', 'test'] as const)(
    'keeps the developer-friendly default in %s',
    (nodeEnv) => {
      expect(parseEnv({ NODE_ENV: nodeEnv }).JWT_SECRET).toBe(DEVELOPMENT_JWT_SECRET);
    }
  );
});
