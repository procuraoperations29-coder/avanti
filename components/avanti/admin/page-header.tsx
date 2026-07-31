import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Standard header for admin console sub-pages: optional back link, title,
 * subtitle, and a right-aligned actions slot. Replaces the ad-hoc
 * "← Admin" link + <p> title that each page used to inline, so every page
 * lands on the same rhythm and type scale.
 */
export function AdminPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-admin-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 font-body text-[13px] text-admin-text-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Section heading inside a page — small emerald accent tick + label. Gives
 * the console a consistent rhythm between stacked blocks (grids, tables).
 */
export function AdminSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-admin-green" aria-hidden />
      <h2 className="font-display text-[15px] font-semibold tracking-tight text-admin-text">
        {children}
      </h2>
    </div>
  );
}

/**
 * Labeled fact row for the admin console — the console-token counterpart to
 * the editorial <SpecRow>. Label muted, value ink; `mono` uses tabular mono
 * for IDs/numbers. Rows divide with a hairline; the last row's border is
 * dropped by the caller's container (`[&>*:last-child]:border-0`) if desired.
 */
export function AdminSpecRow({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: React.ReactNode;
  variant?: 'default' | 'mono';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-admin-border py-2 last:border-0">
      <dt className="shrink-0 font-body text-[12px] font-medium text-admin-text-muted">{label}</dt>
      <dd
        className={cn(
          'text-right text-admin-text',
          variant === 'mono' ? 'font-mono text-[13px] tabular-nums' : 'font-body text-sm'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Compact metric tile for count grids (users-by-role, drivers-by-tier,
 * engagements-by-status). Elevated to match the dashboard KPI cards.
 */
export function MiniStat({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
      {children}
      {label && (
        <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          {label}
        </div>
      )}
      <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-admin-text">
        {value}
      </div>
    </div>
  );
}
