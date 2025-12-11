import * as React from 'react';
import { cn } from '@/lib/utils';
import { spacing } from '@/lib/design-tokens';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    mobile?: 1 | 2;
    tablet?: 1 | 2 | 3;
    desktop?: 1 | 2 | 3 | 4;
  };
  spacing?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = { mobile: 1, tablet: 2, desktop: 3 }, spacing: spacingProp, gap: gapProp, children, ...props }, ref) => {
    const gapValue = gapProp ? spacing[gapProp] : spacing[spacingProp || 'md'];

    const gridCols = {
      mobile: cols.mobile || 1,
      tablet: cols.tablet || 2,
      desktop: cols.desktop || 3,
    };

    // Map to Tailwind grid classes
    const gridColsClasses = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          gridColsClasses[gridCols.mobile as keyof typeof gridColsClasses] || 'grid-cols-1',
          gridCols.tablet && `md:${gridColsClasses[gridCols.tablet as keyof typeof gridColsClasses] || 'grid-cols-2'}`,
          gridCols.desktop && `lg:${gridColsClasses[gridCols.desktop as keyof typeof gridColsClasses] || 'grid-cols-3'}`,
          className
        )}
        style={{
          gap: gapValue,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Grid.displayName = 'Grid';

export { Grid };
