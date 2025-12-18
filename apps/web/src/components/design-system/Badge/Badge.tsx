import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'waiting' | 'in-progress' | 'completed' | 'error' | 'default';
  size?: 'sm' | 'default' | 'lg';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 sm:gap-3',
          'px-4 sm:px-6 py-2 sm:py-3',
          'rounded-full',
          'font-medium uppercase tracking-wide',
          'border-2',
          'transition-colors',
          // Variants
          {
            'bg-[rgba(212,175,55,0.2)] border-[#D4AF37] text-[#D4AF37]':
              variant === 'waiting',
            'bg-[rgba(255,255,255,0.2)] border-white text-white':
              variant === 'in-progress' || variant === 'completed',
            'bg-[rgba(239,68,68,0.2)] border-[#ef4444] text-[#ef4444]':
              variant === 'error',
            'bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.7)]':
              variant === 'default',
          },
          // Sizes
          {
            'text-xs px-3 py-1.5': size === 'sm',
            'text-sm sm:text-base': size === 'default',
            'text-base sm:text-lg px-6 py-3': size === 'lg',
          },
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
Badge.displayName = 'Badge';

export { Badge };
