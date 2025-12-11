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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Touch target minimum
          'min-h-[48px]',
          // Motion: tap feedback
          'active:scale-[0.98]',
          // Variants
          {
            // Default (primary gold)
            'bg-[#D4AF37] text-[#0a0a0a] hover:bg-[#E8C547] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,175,55,0.3)]':
              variant === 'default',
            // Outline
            'bg-transparent text-white border-2 border-[rgba(255,255,255,0.3)] hover:border-[#D4AF37] hover:text-[#D4AF37]':
              variant === 'outline',
            // Ghost
            'bg-transparent text-[rgba(255,255,255,0.7)] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.1)]':
              variant === 'ghost',
            // Destructive
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
