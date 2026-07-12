import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          // Base
          'flex h-11 w-full border border-line-strong bg-paper-2 px-3 py-2',
          'font-body text-sm text-ink placeholder:text-ink-faint',
          // Focus
          'outline-none focus:border-ink',
          // Disabled
          'disabled:cursor-not-allowed disabled:opacity-60',
          // File input
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
