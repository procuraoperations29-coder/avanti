import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Multi-step progress indicator. Used in onboarding (10 steps),
 * booking flow (4-5 steps), verification submission, etc.
 *
 * Horizontal on desktop, scrollable on mobile if steps overflow.
 */

export interface StepProgressBarProps {
  steps: readonly string[];
  current: number; // 0-indexed
  className?: string;
  compact?: boolean;
}

export function StepProgressBar({
  steps,
  current,
  className,
  compact = false,
}: StepProgressBarProps) {
  return (
    <ol
      className={cn(
        'flex w-full items-start gap-2 overflow-x-auto pb-1',
        className
      )}
      aria-label="Progress"
    >
      {steps.map((label, i) => {
        const status = i < current ? 'complete' : i === current ? 'current' : 'upcoming';
        return (
          <li key={label + i} className="flex flex-1 items-start gap-2 min-w-0">
            <div className="flex flex-col items-center min-w-0">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center border font-mono text-xs',
                  status === 'complete' && 'border-green bg-green text-paper',
                  status === 'current' && 'border-ink bg-ink text-paper',
                  status === 'upcoming' && 'border-line-strong bg-paper-2 text-ink-muted'
                )}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                {status === 'complete' ? <Check className="h-4 w-4" strokeWidth={2.5} /> : i + 1}
              </div>
              {!compact && (
                <span
                  className={cn(
                    'mt-2 text-center font-mono text-[10px] uppercase tracking-wider max-w-[9rem] truncate',
                    status === 'upcoming' ? 'text-ink-muted' : 'text-ink'
                  )}
                >
                  {label}
                </span>
              )}
            </div>

            {i < steps.length - 1 && (
              <div
                className={cn(
                  'mt-4 h-px flex-1 min-w-[1rem]',
                  status === 'complete' ? 'bg-green' : 'bg-line-strong'
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
