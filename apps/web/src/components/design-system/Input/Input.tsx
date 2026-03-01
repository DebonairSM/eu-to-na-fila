import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/design-tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', error = false, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn(
          // Base styles
          'flex w-full rounded-lg',
          'bg-[var(--shop-surface-secondary,#1a1a1a)] border',
          'px-4 py-3.5',
          'text-[var(--shop-text-primary,#ffffff)] placeholder:text-[var(--shop-text-secondary,rgba(255,255,255,0.5))]',
          'text-base', // 16px minimum for mobile
          'min-h-[52px]', // Touch-friendly height
          'transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[var(--shop-accent,#D4AF37)] focus:border-[var(--shop-accent,#D4AF37)]',
          // Error state
          error
            ? 'border-[#ef4444] focus:ring-[#ef4444]'
            : 'border-[var(--shop-border-color,rgba(255,255,255,0.2))]',
          className
        )}
        style={{
          transitionDuration: motion.duration.fast,
          transitionTimingFunction: motion.ease.standard,
        }}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const InputLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-medium uppercase tracking-wide mb-2',
        'text-[var(--shop-text-secondary,rgba(255,255,255,0.7))]',
        className
      )}
      {...props}
    />
  );
});
InputLabel.displayName = 'InputLabel';

interface InputErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message: string;
  /** Optional id for linking from input aria-describedby; defaults to React useId() */
  id?: string;
}

const InputError = React.forwardRef<HTMLParagraphElement, InputErrorProps>(
  ({ className, message, id: idProp, ...props }, ref) => {
    const generatedId = React.useId();
    const id = idProp ?? generatedId;

    if (!message) return null;

    return (
      <p
        ref={ref}
        id={id}
        role="alert"
        aria-live="polite"
        className={cn(
          'mt-2 text-sm text-[#ef4444] flex items-center gap-1',
          'animate-in slide-in-from-top-4',
          className
        )}
        {...props}
      >
        <span className="material-symbols-outlined text-base" aria-hidden>error</span>
        {message}
      </p>
    );
  }
);
InputError.displayName = 'InputError';

export { Input, InputLabel, InputError };
