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
            'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)]':
              variant === 'default',
            'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] shadow-md':
              variant === 'elevated',
            'bg-transparent border border-[rgba(255,255,255,0.15)]':
              variant === 'outlined',
          },
          // Hover: subtle border change only, no lift
          hover && 'lg:hover:border-[rgba(212,175,55,0.35)]',
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
      className={cn('text-xl sm:text-2xl font-semibold text-white leading-tight', className)}
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
