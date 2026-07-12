import { cn } from '@/lib/utils/cn';

/**
 * SectionLabel — small monospace uppercase label used above every
 * section head. The editorial device that makes Avanti feel like a
 * newspaper rather than a SaaS app.
 *
 *   <SectionLabel>Sign in</SectionLabel>
 *   <h1>Welcome back.</h1>
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
      className={cn('font-mono text-xs uppercase tracking-wider text-ink-muted', className)}
    >
      {children}
    </div>
  );
}
