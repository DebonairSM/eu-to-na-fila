import * as React from 'react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-tokens';

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  as?: 'p' | 'span' | 'div';
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  ({ className, variant = 'primary', size = 'base', as: Component = 'p', ...props }, ref) => {
    const colorClasses = {
      primary: 'text-white',
      secondary: 'text-[rgba(255,255,255,0.7)]',
      tertiary: 'text-[rgba(255,255,255,0.5)]',
    };

    const sizeClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base lg:text-lg', // 16px mobile, 18px desktop
      lg: 'text-lg lg:text-xl',
      xl: 'text-xl lg:text-2xl',
    };

    return (
      <Component
        ref={ref as any}
        className={cn(
          colorClasses[variant],
          sizeClasses[size],
          'leading-[1.6]', // Relaxed line height for readability
          className
        )}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

export { Text };
