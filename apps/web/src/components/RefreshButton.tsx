import { useRef, useEffect, useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';

export type RefreshButtonProps = {
  isRefreshing: boolean;
  onRefresh: () => void | Promise<void>;
  /** Accessible label (e.g. from t('status.refresh')) */
  ariaLabel: string;
  /** Visible label, defaults to same as ariaLabel */
  label?: string;
  /** Optional extra class for the wrapper (e.g. for layout) */
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'disabled' | 'aria-label'>;

const baseClasses =
  'flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-[var(--shop-accent)] text-[var(--shop-accent)] bg-[color-mix(in_srgb,var(--shop-accent)_8%,transparent)] hover:bg-[var(--shop-accent)] hover:text-[var(--shop-text-on-accent)] transition-transform duration-200 ease-out hover:scale-105 active:scale-95 disabled:opacity-60 disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed';

/**
 * Shared refresh button with reload animation.
 * When idle: subtle pulse; on click the icon spins once for feedback, then loading spin if applicable.
 * When loading: icon spins; button resets to idle when loading ends.
 */
export function RefreshButton({
  isRefreshing,
  onRefresh,
  ariaLabel,
  label,
  className = '',
  ...rest
}: RefreshButtonProps) {
  const displayLabel = label ?? ariaLabel;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasRefreshingRef = useRef(isRefreshing);
  const [clickSpin, setClickSpin] = useState(false);

  useEffect(() => {
    if (wasRefreshingRef.current && !isRefreshing && document.activeElement === buttonRef.current) {
      (document.activeElement as HTMLElement).blur();
    }
    wasRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  const handleClick = () => {
    if (!isRefreshing) setClickSpin(true);
    onRefresh();
  };

  const handleSpinEnd = () => setClickSpin(false);

  const iconSpinClass = isRefreshing ? 'refresh-icon-spin' : clickSpin ? 'refresh-icon-spin-once' : '';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleClick}
      disabled={isRefreshing}
      aria-label={ariaLabel}
      aria-busy={isRefreshing}
      className={`${baseClasses} ${!isRefreshing ? 'refresh-button-idle' : 'refresh-button-loading'} ${className}`.trim()}
      {...rest}
    >
      <span
        className={`material-symbols-outlined text-xl select-none ${iconSpinClass}`}
        aria-hidden
        onAnimationEnd={handleSpinEnd}
      >
        {isRefreshing ? 'progress_activity' : 'refresh'}
      </span>
      <span className="text-sm font-medium">{displayLabel}</span>
    </button>
  );
}
