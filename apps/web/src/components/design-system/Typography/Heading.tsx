import * as React from 'react';
import { cn } from '@/lib/utils';
import { typography } from '@/lib/design-tokens';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as, level, children, ...props }, ref) => {
    const Tag = as || (`h${level || 1}` as keyof JSX.IntrinsicElements);
    const headingLevel = level || parseInt((as || 'h1').substring(1));

    const baseStyles = 'font-["Playfair_Display",serif] font-semibold text-white';

    const sizeClasses = {
      1: 'text-[clamp(2.2rem,7vw,4.5rem)] lg:text-[clamp(3rem,5vw,5.5rem)] leading-[1.1]',
      2: 'text-[clamp(2rem,5vw,3.5rem)] leading-tight',
      3: 'text-[clamp(1.75rem,4vw,2.5rem)] lg:text-[clamp(2.5rem,4vw,3.5rem)]',
      4: 'text-2xl sm:text-3xl',
      5: 'text-xl sm:text-2xl',
      6: 'text-lg sm:text-xl',
    };

    return (
      <Tag
        ref={ref}
        className={cn(baseStyles, sizeClasses[headingLevel as keyof typeof sizeClasses], className)}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Heading.displayName = 'Heading';

export { Heading };
