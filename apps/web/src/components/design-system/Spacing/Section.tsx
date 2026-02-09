import * as React from 'react';
import { cn } from '@/lib/utils';
import { Container } from './Container';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'primary' | 'secondary';
  containerSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  fullWidth?: boolean;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, variant = 'primary', containerSize = '2xl', fullWidth = false, children, ...props }, ref) => {
    const bgVar = variant === 'primary' ? 'var(--shop-surface-primary, #0a0a0a)' : 'var(--shop-surface-secondary, #1a1a1a)';

    return (
      <section
        ref={ref}
        className={cn('py-16 lg:py-20', className)}
        style={{ backgroundColor: bgVar }}
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
