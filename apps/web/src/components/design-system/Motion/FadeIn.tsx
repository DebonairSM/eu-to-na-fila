import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow';
  children: React.ReactNode;
}

export function FadeIn({ className, delay = 0, duration = 'normal', children, ...props }: FadeInProps) {
  const durationValue = motion.duration[duration];

  return (
    <div
      className={cn('animate-in fade-in', className)}
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
