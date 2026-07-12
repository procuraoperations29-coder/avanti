import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full border border-line-strong bg-paper-2 px-3 py-2',
          'font-body text-sm text-ink placeholder:text-ink-faint',
          'outline-none focus:border-ink',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'resize-y',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
