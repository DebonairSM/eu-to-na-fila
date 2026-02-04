import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface StatusTransitionProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'waiting' | 'in-progress' | 'completed';
  children: React.ReactNode;
}

export function StatusTransition({ className, status, children, ...props }: StatusTransitionProps) {
  return (
    <div
      className={cn(
        'transition-all',
        {
          'animate-in fade-in slide-in-from-bottom-4': status === 'waiting',
          'animate-in fade-in': status === 'in-progress' || status === 'completed',
        },
        className
      )}
      style={{
        transitionDuration: motion.duration.slow,
        transitionTimingFunction: motion.ease.standard,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
