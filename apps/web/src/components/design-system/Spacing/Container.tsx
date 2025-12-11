import * as React from 'react';
import { cn } from '@/lib/utils';
import { containers, section } from '@/lib/design-tokens';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullWidth?: boolean;
}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = '2xl', fullWidth = false, ...props }, ref) => {
    const maxWidth = fullWidth ? 'none' : containers[size];

    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto',
          'px-4 sm:px-6 lg:px-8', // Responsive padding using Tailwind
          className
        )}
        style={{
          maxWidth: maxWidth,
        }}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';

export { Container };
