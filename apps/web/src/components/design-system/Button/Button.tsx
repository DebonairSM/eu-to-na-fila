import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', fullWidth = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2 sm:gap-3',
          'font-semibold rounded-lg',
          'transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-accent,#D4AF37)] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Touch target minimum
          'min-h-[48px]',
          // Motion: tap feedback
          'active:scale-[0.98]',
          // Variants
          {
            'bg-[var(--shop-accent,#D4AF37)] text-[var(--shop-text-on-accent,#0a0a0a)] hover:bg-[var(--shop-accent-hover,#E8C547)]':
              variant === 'default',
            'bg-transparent text-white border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)] border-[rgba(255,255,255,0.25)] hover:border-[var(--shop-accent,#D4AF37)] hover:text-[var(--shop-accent,#D4AF37)]':
              variant === 'outline',
            'bg-transparent text-[rgba(255,255,255,0.7)] hover:text-[var(--shop-accent,#D4AF37)] hover:bg-[color-mix(in_srgb,var(--shop-accent,#D4AF37)_15%,transparent)]':
              variant === 'ghost',
            'bg-[#ef4444] text-white hover:bg-[#dc2626]':
              variant === 'destructive',
          },
          // Sizes
          {
            'px-4 py-2 text-sm min-h-[44px]': size === 'sm',
            'px-6 py-3 text-base min-h-[48px]': size === 'default',
            'px-8 py-4 text-lg min-h-[52px]': size === 'lg',
          },
          // Full width
          fullWidth && 'w-full',
          className
        )}
        style={{
          transitionDuration: motion.duration.normal,
          transitionTimingFunction: motion.ease.standard,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
