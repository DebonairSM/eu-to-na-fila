export const REFERENCE_PRESET_IDS = [
  'same_as_last',
  'shorter_sides',
  'fade',
  'skin_fade',
  'beard_trim',
  'undercut',
  'other',
] as const;

export type ReferencePresetId = (typeof REFERENCE_PRESET_IDS)[number];
