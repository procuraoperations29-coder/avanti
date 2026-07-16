import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * WizardHeader — shared header used at the top of every onboarding step.
 * Shows the giant ordinal number, step label, and a back link.
 */

export function WizardHeader({
  ordinal,
  label,
  backHref,
  backLabel,
}: {
  ordinal: string;
  label: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        {backLabel}
      </Link>

      <div className="mb-2 font-display text-8xl leading-none text-brass md:text-9xl">
        {ordinal}
      </div>
      <div className="mb-8 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </div>
    </>
  );
}
