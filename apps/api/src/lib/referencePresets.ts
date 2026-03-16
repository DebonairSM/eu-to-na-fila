import { REFERENCE_PRESET_IDS, type ReferencePresetId } from '@eutonafila/shared';

const SEP = ',';

/**
 * Parse stored next_service_preset (comma-separated) into an array.
 * Backward-compatible: single value "fade" returns ["fade"].
 */
export function parseNextServicePresets(raw: string | null | undefined): ReferencePresetId[] {
  if (raw == null || String(raw).trim() === '') return [];
  const allowed = new Set<string>(REFERENCE_PRESET_IDS);
  return raw
    .split(SEP)
    .map((s) => s.trim())
    .filter((s): s is ReferencePresetId => s.length > 0 && allowed.has(s));
}

/**
 * Serialize array of preset IDs for storage. Empty array -> null.
 */
export function serializeNextServicePresets(ids: ReferencePresetId[] | null | undefined): string | null {
  if (ids == null || ids.length === 0) return null;
  return ids.join(SEP);
}
