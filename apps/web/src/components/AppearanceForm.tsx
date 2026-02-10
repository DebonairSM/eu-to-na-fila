import React, { useState, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { ShopTheme, ShopStyleConfig, StylePresetId, FontToken, DividerStyle } from '@eutonafila/shared';
import { PRESET_PALETTES, type PresetPalette } from '@/lib/presetPalettes';
import { cn } from '@/lib/utils';

const PRESET_LABELS: Record<StylePresetId, string> = {
  modern: 'Moderno',
  classical: 'Clássico',
  vintage: 'Vintage',
  luxury: 'Luxo',
  industrial: 'Industrial',
  minimal: 'Minimal',
};

const THEME_KEYS_GROUPED: { group: string; keys: (keyof ShopTheme)[] }[] = [
  { group: 'Principal e destaque', keys: ['primary', 'accent'] },
  { group: 'Fundo e superfícies', keys: ['background', 'surfacePrimary', 'surfaceSecondary'] },
  { group: 'Navegação e texto', keys: ['navBg', 'textPrimary', 'textSecondary', 'borderColor'] },
  { group: 'Destaque (extras)', keys: ['textOnAccent', 'accentHover'] },
];

function hexOrRgba(value: string): 'hex' | 'other' {
  const v = (value ?? '').trim();
  if (/^#[0-9A-Fa-f]{3,8}$/.test(v)) return 'hex';
  return 'other';
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
}

export function AppearanceForm({
  formData,
  setFormData,
  variant,
  paletteIndices,
  onRerollPalettes,
}: AppearanceFormProps) {
  const [openPickerKey, setOpenPickerKey] = useState<keyof ShopTheme | null>(null);
  const preset = formData.style.preset ?? 'modern';
  const palettes = PRESET_PALETTES[preset];
  const presetName = PRESET_LABELS[preset];

  const suggestedPalettes = paletteIndices
    .map((i) => palettes[i])
    .filter(Boolean);

  const applyPalette = useCallback(
    (palette: { theme: PresetPalette['theme'] }) => {
      setFormData((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...palette.theme },
      }));
    },
    [setFormData]
  );

  const isRoot = variant === 'root';
  const activeClass = isRoot ? 'bg-white/20 text-white' : 'bg-[#D4AF37]/20 text-[#D4AF37]';
  const inactiveClass = isRoot ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-white/10 text-white/70 hover:text-white';
  const inputClass = isRoot
    ? 'w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm'
    : 'w-full px-3 py-2 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-lg text-white text-sm';

  return (
    <div className="space-y-6">
      <p className="text-white/60 text-sm">Estilo visual e cores da página inicial.</p>

      {/* Style preset */}
      <div className="space-y-4">
        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">Estilo da página</h4>
        <p className="text-white/50 text-xs">Define fontes, cantos e ícones em todas as páginas da barbearia.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(PRESET_LABELS) as [StylePresetId, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, style: { ...prev.style, preset: id } }))}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-colors', formData.style.preset === id ? activeClass : inactiveClass)}
            >
              {label}
            </button>
          ))}
        </div>
        <details className="mt-3">
          <summary className="text-white/60 text-sm cursor-pointer">Ajustes opcionais</summary>
          <div className="mt-3 space-y-3 pl-2 border-l border-white/10">
            <div>
              <label className="block text-white/50 text-xs mb-1">Fonte dos títulos</label>
              <select
                value={formData.style.headingFont ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, headingFont: (e.target.value || undefined) as FontToken | undefined } }))}
                className={inputClass}
              >
                <option value="">Padrão do estilo</option>
                {(['playfair_display', 'cormorant_garamond', 'lora', 'abril_fatface', 'oswald', 'dm_sans', 'inter', 'crimson_text', 'roboto_condensed', 'montserrat'] as FontToken[]).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Fonte do corpo</label>
              <select
                value={formData.style.bodyFont ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, bodyFont: (e.target.value || undefined) as FontToken | undefined } }))}
                className={inputClass}
              >
                <option value="">Padrão do estilo</option>
                {(['inter', 'lora', 'crimson_text', 'roboto_condensed', 'dm_sans', 'montserrat', 'playfair_display', 'cormorant_garamond', 'abril_fatface', 'oswald'] as FontToken[]).map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Peso dos ícones (100–700)</label>
              <input
                type="number"
                min={100}
                max={700}
                value={formData.style.iconWeight ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, iconWeight: e.target.value === '' ? undefined : parseInt(e.target.value, 10) } }))}
                placeholder="Padrão"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">Estilo do divisor</label>
              <select
                value={formData.style.dividerStyle ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, style: { ...prev.style, dividerStyle: (e.target.value || undefined) as DividerStyle | undefined } }))}
                className={inputClass}
              >
                <option value="">Padrão</option>
                <option value="line">Linha</option>
                <option value="ornament">Ornamento</option>
                <option value="dots">Pontos</option>
                <option value="none">Nenhum</option>
              </select>
            </div>
          </div>
        </details>
      </div>

      {/* Color suggestions for current preset */}
      <div className="space-y-3">
        <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">
          Sugestões de cores para {presetName}
        </h4>
        <p className="text-white/50 text-xs">Clique em um conjunto para aplicar. Use &quot;Outras sugestões&quot; para ver mais.</p>
        <div className="flex flex-wrap gap-2">
          {suggestedPalettes.map((palette, idx) => (
            <button
              key={`${palette.label}-${idx}`}
              type="button"
              onClick={() => applyPalette(palette)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 transition-colors text-left"
            >
              <div className="flex rounded overflow-hidden border border-white/10 h-8 w-16 shrink-0">
                <div className="flex-1" style={{ backgroundColor: palette.theme.background }} title="Fundo" />
                <div className="flex-1" style={{ backgroundColor: palette.theme.accent }} title="Destaque" />
                <div className="flex-1" style={{ backgroundColor: palette.theme.surfaceSecondary }} title="Superfície" />
              </div>
              <span className="text-white/90 text-xs font-medium max-w-[100px] truncate">{palette.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={onRerollPalettes}
            className="px-3 py-2 rounded-lg border border-dashed border-white/30 text-white/70 text-xs hover:bg-white/10 hover:text-white transition-colors"
          >
            Outras sugestões
          </button>
        </div>
      </div>

      {/* Color pickers by group */}
      {THEME_KEYS_GROUPED.map(({ group, keys }) => (
        <div key={group} className="space-y-4">
          <h4 className="text-white/80 text-sm font-medium border-b border-white/10 pb-2">{group}</h4>
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
                      aria-label={`Escolher cor ${key}`}
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
                      placeholder="#hex ou rgba()"
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
