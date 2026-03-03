import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant: line (thin), block (rectangle), card (rounded block), listRow (medium height row) */
  variant?: 'line' | 'block' | 'card' | 'listRow';
}

const variantClasses = {
  line: 'h-3 rounded',
  block: 'rounded-lg',
  card: 'rounded-xl border border-white/10',
  listRow: 'h-14 sm:h-16 rounded-md border border-white/10',
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'block', ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="presentation"
        aria-hidden="true"
        className={cn(
          'bg-white/5 animate-pulse',
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

export { Skeleton };
