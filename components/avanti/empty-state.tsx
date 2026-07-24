import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * EmptyState — shown when there's nothing to display. Not a shrug or
 * a smiley — this is meant to look intentional. Editorial feel: serif
 * headline, muted body, optional single primary action.
 */

export interface EmptyStateProps {
  Icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-paper-2 px-6 py-16 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line-strong bg-paper">
          <Icon className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="mb-2 font-display text-2xl leading-tight text-ink">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm font-body text-sm text-ink-muted">{description}</p>
      )}
      {action}
    </div>
  );
}
