import { DEFAULT_HOME_CONTENT } from '@eutonafila/shared';
import type { HomeContent } from '@eutonafila/shared';

export { DEFAULT_HOME_CONTENT };
export type { HomeContent };

/**
 * Deep-merge stored home content with defaults.
 * Ensures the returned value always has every field from DEFAULT_HOME_CONTENT.
 */
export function mergeHomeContent(stored: unknown): HomeContent {
  if (!stored || typeof stored !== 'object') return DEFAULT_HOME_CONTENT;
  const deepMerge = <T>(def: T, from: unknown): T => {
    if (from == null || typeof from !== 'object') return def;
    const o = from as Record<string, unknown>;
    const out = { ...def } as Record<string, unknown>;
    for (const k of Object.keys(def as object)) {
      const defVal = (def as Record<string, unknown>)[k];
      const fromVal = o[k];
      if (defVal && typeof defVal === 'object' && !Array.isArray(defVal) && fromVal && typeof fromVal === 'object' && !Array.isArray(fromVal)) {
        out[k] = deepMerge(defVal, fromVal);
      } else if (fromVal !== undefined) {
        out[k] = Array.isArray(fromVal) ? [...fromVal] : fromVal;
      }
    }
    return out as T;
  };
  return deepMerge(DEFAULT_HOME_CONTENT, stored);
}

/**
 * Returns true if the stored value is a locale-keyed record (has pt-BR or en as key).
 */
function isLocaleRecord(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some((k) => k === 'pt-BR' || k === 'en');
}

/**
 * Normalize stored home_content to Record<string, HomeContent> for the public API.
 * Legacy single object becomes { "pt-BR": merged(stored) }.
 */
export function normalizeToHomeContentByLocale(stored: unknown): Record<string, HomeContent> {
  if (!stored || typeof stored !== 'object') {
    return { 'pt-BR': DEFAULT_HOME_CONTENT };
  }
  const o = stored as Record<string, unknown>;
  if (isLocaleRecord(o)) {
    const out: Record<string, HomeContent> = {};
    for (const locale of Object.keys(o)) {
      const val = o[locale];
      if (val != null && typeof val === 'object') {
        out[locale] = mergeHomeContent(val);
      }
    }
    if (Object.keys(out).length === 0) return { 'pt-BR': DEFAULT_HOME_CONTENT };
    return out;
  }
  return { 'pt-BR': mergeHomeContent(stored) };
}
