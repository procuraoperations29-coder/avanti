'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * ErrorState — shown when a load fails, an operation errors, or a
 * boundary catches. Distinct from EmptyState (which is expected) —
 * this signals something went wrong.
 *
 * Uses oxblood as accent, keeps the tone measured (not alarming).
 */

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try again',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center border border-oxblood/40 bg-paper-2 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center border border-oxblood/40 bg-paper">
        <AlertCircle className="h-5 w-5 text-oxblood" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 font-display text-2xl leading-tight text-ink">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm font-body text-sm text-ink-muted">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
