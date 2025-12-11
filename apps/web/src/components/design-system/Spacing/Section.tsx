import * as React from 'react';
import { cn } from '@/lib/utils';
import { section } from '@/lib/design-tokens';
import { Container } from './Container';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'primary' | 'secondary';
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullWidth?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant = 'primary', containerSize = '2xl', fullWidth = false, children, ...props }, ref) => {
    const bgColor = variant === 'primary' ? 'bg-[#0a0a0a]' : 'bg-[#1a1a1a]';

    return (
      <section
        ref={ref}
        className={cn(
          bgColor,
          'py-12 sm:py-16 lg:py-24', // Responsive padding using Tailwind (48px mobile, 64px desktop)
          className
        )}
        {...props}
      >
        <Container size={containerSize} fullWidth={fullWidth}>
          {children}
        </Container>
      </section>
    );
  }
);
Section.displayName = 'Section';

export { Section };
