import { cn } from '@/lib/utils/cn';

/**
 * SpecRow — a labeled fact. Used to show details on driver dossiers,
 * engagement summaries, contract terms, etc.
 *
 *   NAME               Ada Okonkwo
 *   PHONE              +234 801 234 5678
 *   RATE               ₦4,500/hour
 *
 * Label is monospace uppercase muted; value is body text ink.
 * Emphasis variant uses display serif for headline-worthy values (prices, totals).
 */

export interface SpecRowProps {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'emphasis' | 'mono';
  className?: string;
  align?: 'stack' | 'inline';
}

export function SpecRow({
  label,
  value,
  variant = 'default',
  align = 'inline',
  className,
}: SpecRowProps) {
  return (
    <div
      className={cn(
        align === 'inline'
          ? 'flex items-baseline justify-between gap-4 border-b border-line py-2'
          : 'flex flex-col gap-1 py-2',
        className
      )}
    >
      <dt className="font-mono text-xs uppercase tracking-wider text-ink-muted shrink-0">
        {label}
      </dt>
      <dd
        className={cn(
          'text-ink',
          variant === 'default' && 'font-body text-sm',
          variant === 'emphasis' && 'font-display text-xl leading-none',
          variant === 'mono' && 'font-mono text-sm'
        )}
      >
        {value}
      </dd>
    </div>
  );
}
