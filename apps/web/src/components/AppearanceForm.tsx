import React, { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { ShopTheme, ShopStyleConfig, StylePresetId, LayoutId, FontToken, DividerStyle } from '@eutonafila/shared';
import { PRESET_PALETTES, type PresetPalette } from '@/lib/presetPalettes';
import { LAYOUT_LABELS, PRESET_RECOMMENDED_LAYOUTS, isLayoutRecommendedForPreset } from '@/lib/layouts';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

const PRESET_LABEL_KEYS: Record<StylePresetId, string> = {
  modern: 'appearance.presetModern',
  classical: 'appearance.presetClassical',
  vintage: 'appearance.presetVintage',
  luxury: 'appearance.presetLuxury',
  industrial: 'appearance.presetIndustrial',
  minimal: 'appearance.presetMinimal',
};

const THEME_KEYS_GROUPED: { groupKey: string; keys: (keyof ShopTheme)[] }[] = [
  { groupKey: 'appearance.groupPrimary', keys: ['primary', 'accent'] },
  { groupKey: 'appearance.groupBackground', keys: ['background', 'surfacePrimary', 'surfaceSecondary'] },
  { groupKey: 'appearance.groupNav', keys: ['navBg', 'textPrimary', 'textSecondary', 'borderColor'] },
  { groupKey: 'appearance.groupExtras', keys: ['textOnAccent', 'accentHover'] },
];

function hexOrRgba(value: string): 'hex' | 'other' {
  const v = (value ?? '').trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return 'hex';
  return 'other';
}

export interface SavedPalette {
  label: string;
  theme: ShopTheme;
}

export interface AppearanceFormProps {
  formData: {
    theme: ShopTheme;
    style: ShopStyleConfig;
  };
  setFormData: React.Dispatch<React.SetStateAction<{ theme: ShopTheme; style: ShopStyleConfig }>>;
  variant: 'root' | 'mineiro';
  paletteIndices: [number, number, number];
  onRerollPalettes: () => void;
  /** All user-saved color palettes (shown regardless of current preset). */
  savedPalettes?: SavedPalette[];
  /** Save current theme as a named palette. */
  onSaveCurrentPalette?: (label: string) => void;
}

export function AppearanceForm({
  formData,
  setFormData,
  variant,
  paletteIndices,
  onRerollPalettes,
  savedPalettes = [],
  onSaveCurrentPalette,
}: AppearanceFormProps) {
  const { t } = useLocale();
  const [openPickerKey, setOpenPickerKey] = useState<keyof ShopTheme | null>(null);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const preset = formData.style.preset ?? 'modern';
  const palettes = PRESET_PALETTES[preset];
  const presetName = t(PRESET_LABEL_KEYS[preset]);

  const suggestedPalettes = paletteIndices
    .map((i) => palettes[i])
    .filter(Boolean);

  const applyPalette = useCallback(
    (palette: { theme: PresetPalette['theme'] | ShopTheme }) => {
      setFormData((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...palette.theme },
      }));
    },
    [setFormData]
  );

  const handleSavePalette = useCallback(() => {
    const label = (saveLabel || t('appearance.myColorsDefault')).trim();
    if (label && onSaveCurrentPalette) {
      onSaveCurrentPalette(label);
      setSaveLabel('');
      setShowSaveInput(false);
    }
  }, [saveLabel, onSaveCurrentPalette, t]);

  const isRoot = variant === 'root';
  const activeClass = isRoot ? 'bg-white/20 text-white' : 'bg-[#D4AF37]/20 text-[#D4AF37]';
  const inactiveClass = isRoot ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-white/10 text-white/70 hover:text-white';
  const inputClass = isRoot
    ? 'w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm'
    : 'w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm';

  return (
    <div className="space-y-6">
      <p className="text-white/60 text-sm">{t('appearance.intro')}</p>

      {/* Style preset */}
      <div className="space-y-4">
        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">{t('appearance.styleSectionTitle')}</h4>
        <p className="text-white/50 text-xs">{t('appearance.styleSectionDesc')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(PRESET_LABEL_KEYS) as [StylePresetId, string][]).map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, style: { ...prev.style, preset: id } }))}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', formData.style.preset === id ? activeClass : inactiveClass)}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <details className="mt-3">
          <summary className="text-white/60 text-sm cursor-pointer">{t('appearance.optionalAdjustments')}</summary>
          <div className="mt-3 space-y-3 pl-2 border-l border-white/10">
            <div>
              <label className="block text-white/50 text-xs mb-1">{t('appearance.headingFontLabel')}</label>
              <select
                value={formData.style.headingFont ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, headingFont: (e.target.value || undefined) as FontToken | undefined } }))}
                className={inputClass}
              >
                <option value="">{t('appearance.defaultStyle')}</option>
                {(['playfair_display', 'cormorant_garamond', 'lora', 'abril_fatface', 'oswald', 'dm_sans', 'inter', 'crimson_text', 'roboto_condensed', 'montserrat'] as FontToken[]).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">{t('appearance.bodyFontLabel')}</label>
              <select
                value={formData.style.bodyFont ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, bodyFont: (e.target.value || undefined) as FontToken | undefined } }))}
                className={inputClass}
              >
                <option value="">{t('appearance.defaultStyle')}</option>
                {(['inter', 'lora', 'crimson_text', 'roboto_condensed', 'dm_sans', 'montserrat', 'playfair_display', 'cormorant_garamond', 'abril_fatface', 'oswald'] as FontToken[]).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">{t('appearance.iconWeightLabel')}</label>
              <input
                type="number"
                min={100}
                max={700}
                value={formData.style.iconWeight ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, iconWeight: e.target.value === '' ? undefined : parseInt(e.target.value, 10) } }))}
                placeholder={t('appearance.default')}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">{t('appearance.dividerStyleLabel')}</label>
              <select
                value={formData.style.dividerStyle ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, dividerStyle: (e.target.value || undefined) as DividerStyle | undefined } }))}
                className={inputClass}
              >
                <option value="">{t('appearance.default')}</option>
                <option value="line">{t('appearance.dividerLine')}</option>
                <option value="ornament">{t('appearance.dividerOrnament')}</option>
                <option value="dots">{t('appearance.dividerDots')}</option>
                <option value="none">{t('appearance.none')}</option>
              </select>
            </div>
          </div>
        </details>
      </div>

      {/* Layout (hero structure, section decoration, independent from preset) */}
      <div className="space-y-4">
        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">{t('appearance.layoutSectionTitle')}</h4>
        <p className="text-white/50 text-xs">{t('appearance.layoutSectionDesc')}</p>
        <p className="text-white/50 text-xs">
          {t('appearance.recommendedFor').replace('{preset}', presetName)}:{' '}
          {PRESET_RECOMMENDED_LAYOUTS[preset].map((id) => LAYOUT_LABELS[id]).join(', ')}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(LAYOUT_LABELS) as [LayoutId, string][]).map(([id, label]) => {
            const recommended = isLayoutRecommendedForPreset(preset, id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, style: { ...prev.style, layout: id } }))}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left flex flex-col items-start gap-0.5',
                  (formData.style.layout ?? 'centered') === id ? activeClass : inactiveClass,
                  recommended && 'ring-1 ring-white/30'
                )}
              >
                <span>{label}</span>
                {recommended && <span className="text-[10px] uppercase tracking-wider text-white/50">{t('appearance.recommended')}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color suggestions for current preset */}
      <div className="space-y-3">
        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">
          {t('appearance.colorSuggestionsTitle').replace('{preset}', presetName)}
        </h4>
        <p className="text-white/50 text-xs">{t('appearance.clickToApply')}</p>
        <div className="flex flex-wrap gap-2">
          {suggestedPalettes.map((palette, idx) => (
            <button
              key={`${palette.label}-${idx}`}
              type="button"
              onClick={() => applyPalette(palette)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="flex rounded overflow-hidden border border-white/10 h-8 w-16 shrink-0">
                <div className="flex-1" style={{ backgroundColor: palette.theme.background }} title={t('appearance.backgroundTitle')} />
                <div className="flex-1" style={{ backgroundColor: palette.theme.accent }} title={t('appearance.accentTitle')} />
                <div className="flex-1" style={{ backgroundColor: palette.theme.surfaceSecondary }} title={t('appearance.surfaceTitle')} />
              </div>
              <span className="text-white/90 text-xs font-medium max-w-[100px] truncate">{palette.label}</span>
            </button>
          ))}
          {savedPalettes.map((palette, idx) => (
            <button
              key={`saved-${palette.label}-${idx}`}
              type="button"
              onClick={() => applyPalette(palette)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--shop-accent,#D4AF37)]/40 bg-[var(--shop-accent,#D4AF37)]/5 hover:bg-[var(--shop-accent,#D4AF37)]/10 transition-colors text-left"
            >
              <div className="flex rounded overflow-hidden border border-white/10 h-8 w-16 shrink-0">
                <div className="flex-1" style={{ backgroundColor: palette.theme.background }} title={t('appearance.backgroundTitle')} />
                <div className="flex-1" style={{ backgroundColor: palette.theme.accent }} title={t('appearance.accentTitle')} />
                <div className="flex-1" style={{ backgroundColor: palette.theme.surfaceSecondary }} title={t('appearance.surfaceTitle')} />
              </div>
              <span className="text-white/90 text-xs font-medium max-w-[100px] truncate">{palette.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onRerollPalettes}
            className="px-3 py-2 rounded-lg border border-dashed border-white/30 text-white/70 text-xs hover:bg-white/10 hover:text-white transition-colors"
          >
            {t('appearance.otherSuggestions')}
          </button>
          {onSaveCurrentPalette && (
            <>
              {showSaveInput ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePalette()}
                    placeholder={t('appearance.paletteNamePlaceholder')}
                    className={cn(inputClass, 'min-w-[120px]')}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSavePalette}
                    className="px-3 py-2 rounded-lg bg-[var(--shop-accent,#D4AF37)]/20 text-[var(--shop-accent,#D4AF37)] text-xs font-medium hover:bg-[var(--shop-accent,#D4AF37)]/30"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowSaveInput(false); setSaveLabel(''); }}
                    className="px-3 py-2 rounded-lg text-white/70 text-xs hover:text-white"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSaveInput(true)}
                  className="px-3 py-2 rounded-lg border border-white/20 text-white/70 text-xs hover:bg-white/10 hover:text-white transition-colors"
                >
                  {t('appearance.saveCurrentColors')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Color pickers by group */}
      {THEME_KEYS_GROUPED.map(({ groupKey, keys }) => (
        <div key={groupKey} className="space-y-4">
          <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">{t(groupKey)}</h4>
          <div className="grid grid-cols-2 gap-4">
            {keys.map((key) => {
              const value = formData.theme[key] ?? '';
              const isHex = hexOrRgba(value) === 'hex';
              const displayColor = isHex ? value : '#333';
              const isOpen = openPickerKey === key;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setOpenPickerKey(isOpen ? null : key)}
                      className="w-10 h-10 rounded-lg border border-white/20 shrink-0 block"
                      style={{ backgroundColor: displayColor }}
                      aria-label={t('appearance.chooseColorAria').replace('{key}', key)}
                    />
                    {isOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-[1001]"
                          aria-hidden
                          onClick={() => setOpenPickerKey(null)}
                        />
                        <div className="absolute left-0 top-full mt-1 z-[1002] p-2 rounded-lg bg-[#1a1a1a] border border-white/20 shadow-xl">
                          <HexColorPicker
                            color={isHex ? value : '#000000'}
                            onChange={(hex) =>
                              setFormData((prev) => ({
                                ...prev,
                                theme: { ...prev.theme, [key]: hex },
                              }))
                            }
                            style={{ width: 160, height: 120 }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="block text-white/60 text-xs mb-1">{key}</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, [key]: e.target.value },
                        }))
                      }
                      placeholder={t('appearance.colorPlaceholder')}
                      className={inputClass}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
