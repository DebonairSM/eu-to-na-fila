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
