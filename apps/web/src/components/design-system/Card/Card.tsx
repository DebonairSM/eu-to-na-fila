import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          'transition-all',
          // Variants
          {
            'bg-[rgba(255,255,255,0.02)] border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)]':
              variant === 'default',
            'bg-[rgba(255,255,255,0.02)] border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)] shadow-md':
              variant === 'elevated',
            'bg-transparent border-[length:var(--shop-border-width,1px)] border-[style:var(--shop-border-style,solid)] border-[rgba(255,255,255,0.15)]':
              variant === 'outlined',
          },
          variant !== 'outlined' && 'border-[var(--shop-border-color,rgba(255,255,255,0.08))]',
          hover && 'lg:hover:border-[color-mix(in_srgb,var(--shop-accent,#D4AF37)_35%,transparent)]',
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
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-2 p-6 sm:p-8', className)}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl sm:text-2xl font-semibold leading-tight', 'text-[var(--shop-text-primary,#ffffff)]', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 sm:p-8 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardTitle, CardContent };
