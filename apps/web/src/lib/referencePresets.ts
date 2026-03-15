import { REFERENCE_PRESET_IDS, type ReferencePresetId } from '@eutonafila/shared';

export const referencePresetLabelKeys: Record<ReferencePresetId, string> = {
  same_as_last: 'account.referencePresetSameAsLast',
  shorter_sides: 'account.referencePresetShorterSides',
  fade: 'account.referencePresetFade',
  skin_fade: 'account.referencePresetSkinFade',
  beard_trim: 'account.referencePresetBeardTrim',
  undercut: 'account.referencePresetUndercut',
  other: 'account.referencePresetOther',
};

export const referencePresetIcons: Record<ReferencePresetId, string> = {
  same_as_last: 'history',
  shorter_sides: 'content_cut',
  fade: 'filter_vintage',
  skin_fade: 'blur_on',
  beard_trim: 'face',
  undercut: 'layers',
  other: 'edit_note',
};

const referencePresetIdSet = new Set<string>(REFERENCE_PRESET_IDS);

export function isReferencePresetId(value: string | null | undefined): value is ReferencePresetId {
  return typeof value === 'string' && referencePresetIdSet.has(value);
}
