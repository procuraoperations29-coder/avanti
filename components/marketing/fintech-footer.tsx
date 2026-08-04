import Link from 'next/link';
import { Logo } from '@/components/brand/logo';

export interface FintechFooterProps {
  columns?: { heading: string; links: { href: string; label: string }[] }[];
}

/**
 * Marketing footer for the fintech landing. Theme-aware (admin-* tokens).
 */
export function FintechFooter({ columns = [] }: FintechFooterProps) {
  return (
    <footer className="border-t border-admin-border bg-admin-card">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo size="sm" />
            <p className="mt-4 max-w-xs font-body text-sm leading-relaxed text-admin-text-muted">
              Nigeria&apos;s curated marketplace for professionally verified drivers. Book by the hour, day, or year.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <div className="font-body text-[12px] font-semibold uppercase tracking-wide text-admin-text-muted">{col.heading}</div>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="font-body text-sm text-admin-text transition-colors hover:text-admin-green-text">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-admin-border pt-6 sm:flex-row sm:items-center">
          <span className="font-body text-[13px] text-admin-text-muted">© 2026 Avanti Solutions Services. Lagos, Nigeria.</span>
          <div className="flex gap-6">
            <Link href="/permanent" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Permanent placements</Link>
            <Link href="/sign-up?role=driver" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Drive with us</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
