import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          'block font-mono text-xs uppercase tracking-wider text-ink-muted',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
          className
        )}
        {...props}
      />
    );
  }
);
Label.displayName = 'Label';

export { Label };
