import Link from 'next/link';
import { Mail, Phone, Instagram } from 'lucide-react';
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
            <div className="mt-5 space-y-2.5">
              <a href="mailto:hello@avanti.com.ng" className="flex items-center gap-2.5 font-body text-sm text-admin-text transition-colors hover:text-admin-green-text">
                <Mail className="h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.75} />
                hello@avanti.com.ng
              </a>
              <a href="tel:+2348105122729" className="flex items-center gap-2.5 font-body text-sm text-admin-text transition-colors hover:text-admin-green-text">
                <Phone className="h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.75} />
                +234 810 512 2729
              </a>
              <a href="https://instagram.com/avanti_nigeria" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 font-body text-sm text-admin-text transition-colors hover:text-admin-green-text">
                <Instagram className="h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.75} />
                @avanti_nigeria
              </a>
            </div>
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
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/permanent" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Permanent placements</Link>
            <Link href="/sign-up?role=driver" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Drive with us</Link>
            <Link href="/terms" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Terms</Link>
            <Link href="/privacy" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Privacy</Link>
            <Link href="/cookies" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
