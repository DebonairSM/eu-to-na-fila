import type { Service } from '@eutonafila/shared';

export interface ServiceChipProps {
  service: Service;
  selected: boolean;
  onToggle: () => void;
  label: string;
  /** Optional: use larger padding/font for kiosk. */
  size?: 'default' | 'kiosk';
}

export function ServiceChip({ service, selected, onToggle, label, size = 'default' }: ServiceChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        w-full min-w-max text-left rounded-xl border-2 px-4 py-3 transition-all
        flex items-center justify-between gap-2
        ${size === 'kiosk' ? 'text-lg py-3.5 px-4 rounded-2xl' : ''}
        ${selected
          ? 'border-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_12%,transparent)]'
          : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.25)]'
        }
      `}
    >
      <span className={`font-medium text-[var(--shop-text-primary)] min-w-0 ${size === 'kiosk' ? 'text-lg' : 'text-sm'}`}>{label}</span>
      {selected && (
        <span className="material-symbols-outlined text-[var(--shop-accent)] text-lg flex-shrink-0" aria-hidden>
          check_circle
        </span>
      )}
    </button>
  );
}
