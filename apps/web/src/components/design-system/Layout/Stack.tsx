import * as React from 'react';
import { cn } from '@/lib/utils';
import { spacing } from '@/lib/design-tokens';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing: spacingProp = 'md', align = 'stretch', children, ...props }, ref) => {
    const spacingValue = spacing[spacingProp];

    return (
      <div
        ref={ref}
        className={cn('flex flex-col', {
          'items-start': align === 'start',
          'items-center': align === 'center',
          'items-end': align === 'end',
          'items-stretch': align === 'stretch',
        }, className)}
        style={{
          gap: spacingValue,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Stack.displayName = 'Stack';

export { Stack };
