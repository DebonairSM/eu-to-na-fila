import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface SlideInProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow';
  children: React.ReactNode;
}

export function SlideIn({
  className,
  direction = 'up',
  delay = 0,
  duration = 'normal',
  children,
  ...props
}: SlideInProps) {
  const durationValue = motion.duration[duration];

  const directionClasses = {
    up: 'slide-in-from-bottom-4',
    down: 'slide-in-from-top-4',
    left: 'slide-in-from-right-4',
    right: 'slide-in-from-left-4',
  };

  return (
    <div
      className={cn('animate-in', directionClasses[direction], className)}
      style={{
        animationDuration: durationValue,
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
