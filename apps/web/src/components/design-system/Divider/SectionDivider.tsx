import { useShopConfig } from '@/contexts/ShopConfigContext';
import { cn } from '@/lib/utils';

/** Renders a divider between sections based on --shop-divider-style (line, ornament, dots, none). */
export function SectionDivider({ className }: { className?: string }) {
  const { config } = useShopConfig();
  const style = config.style?.dividerStyle ?? 'line';
  if (style === 'none') return null;
  return (
    <div
      className={cn('section-divider', `section-divider--${style}`, className)}
      role="presentation"
      aria-hidden
    />
  );
}
