import * as React from 'react';
import { cn } from '@/lib/utils';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as, level, children, ...props }, ref) => {
    const headingLevel = level || (as ? parseInt(as.substring(1)) : 1);
    const tagName = (as || (`h${headingLevel}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6')) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    const baseStyles = 'text-[var(--shop-text-primary,#ffffff)]';

    const sizeClasses = {
      1: 'text-[clamp(2.2rem,7vw,4.5rem)] lg:text-[clamp(3rem,5vw,5.5rem)] leading-[1.1]',
      2: 'text-[clamp(2rem,5vw,3.5rem)] leading-tight',
      3: 'text-[clamp(1.75rem,4vw,2.5rem)] lg:text-[clamp(2.5rem,4vw,3.5rem)]',
      4: 'text-2xl sm:text-3xl',
      5: 'text-xl sm:text-2xl',
      6: 'text-lg sm:text-xl',
    };

    const combinedClassName = cn(baseStyles, sizeClasses[headingLevel as keyof typeof sizeClasses], className);
    const headingStyle: React.CSSProperties = {
      fontFamily: "var(--shop-font-heading, 'Playfair Display', serif)",
      fontWeight: 'var(--shop-heading-weight, 600)' as any,
      letterSpacing: 'var(--shop-heading-letter-spacing, 0em)' as any,
      textTransform: 'var(--shop-heading-transform, none)' as any,
    };

    // Use a switch to properly type each heading element
    switch (tagName) {
      case 'h1':
        return <h1 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h1>;
      case 'h2':
        return <h2 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h2>;
      case 'h3':
        return <h3 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h3>;
      case 'h4':
        return <h4 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h4>;
      case 'h5':
        return <h5 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h5>;
      case 'h6':
        return <h6 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h6>;
      default:
        return <h1 ref={ref} className={combinedClassName} style={headingStyle} {...props}>{children}</h1>;
    }
  }
);
Heading.displayName = 'Heading';

export { Heading };
