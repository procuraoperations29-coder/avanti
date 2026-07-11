import { cn } from '@/lib/utils/cn';

/**
 * The mono-typographic section label used throughout Avanti's UI.
 * Establishes hierarchy without headings; sets the "dossier" register.
 */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'font-mono uppercase text-ink-faint text-[0.7rem] tracking-widest font-medium',
        className
      )}
    >
      {children}
    </div>
  );
}
