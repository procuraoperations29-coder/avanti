import Link from 'next/link';
import { ArrowRight, Check, Clock, CalendarDays, CalendarRange, Briefcase } from 'lucide-react';

/**
 * Public landing page — navy/green fintech redesign.
 *
 * Same copy and structure as before (hero thesis, seven-checks vetting
 * list, engagement continuum). Styled with the --admin-navy/--admin-green
 * tokens from globals.css, scoped to this page only — button.tsx/card.tsx
 * etc. are untouched, so sign-in/sign-up still use the old editorial look
 * until those get a deliberate pass too.
 */
export default function LandingPage() {
  const checks = [
    'Driver licence — validated with authority',
    'Government ID — number & photo confirmed',
    'Proof of address — utility or bank statement',
    'Selfie face-match — against government ID',
    'Background check — third-party partner',
    'Payout-method KYC — name-match verified',
    'Ratings history — from every engagement',
  ];

  const engagements = [
    { label: 'Hourly', Icon: Clock, copy: 'A meeting, a school run, an evening out.' },
    { label: 'Full-day', Icon: CalendarDays, copy: 'A wedding, a business trip, a full itinerary.' },
    { label: 'Monthly', Icon: CalendarRange, copy: 'A regular driver on your terms and schedule.' },
    { label: 'Permanent', Icon: Briefcase, copy: 'A full employment engagement, contracts and payroll handled.' },
  ];

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-admin-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-admin-green">
              <span className="font-body text-xs font-semibold text-admin-navy-2">A</span>
            </div>
            <span className="font-body text-lg font-semibold text-admin-navy">Avanti</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="font-body text-sm font-medium text-admin-text-muted hover:text-admin-navy"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up/customer"
              className="rounded-lg bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-admin-navy-2"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-admin-navy">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-6 font-body text-[13px] font-medium uppercase tracking-[0.15em] text-admin-nav-text">
            Established 2026 · Lagos, Nigeria
          </p>

          <h1 className="mb-8 font-body text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-tight text-white">
            The driver is the hire.
            <br />
            <span className="text-admin-green">Not the ride.</span>
          </h1>

          <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-admin-nav-text sm:text-xl">
            Hire a professional driver — background-checked, insurance-aware,
            contract-covered — to operate your own vehicle. By the hour, the
            day, the month, or as a permanent hire.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/sign-up/customer"
              className="inline-flex items-center rounded-lg bg-admin-green px-6 py-3 font-body text-sm font-medium text-admin-navy-2 transition-colors hover:brightness-95"
            >
              Find a driver <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
            </Link>
            <Link
              href="/sign-up/corporate"
              className="inline-flex items-center rounded-lg border border-white/25 px-6 py-3 font-body text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              For business
            </Link>
          </div>
        </div>
      </section>

      {/* Vetting */}
      <section className="bg-admin-bg">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <p className="mb-3 font-body text-[13px] font-medium uppercase tracking-[0.1em] text-admin-green-text">
              Vetting
            </p>
            <h2 className="mb-5 font-body text-3xl font-semibold leading-tight text-admin-text sm:text-4xl">
              Seven checks before you meet.
            </h2>
            <p className="font-body leading-relaxed text-admin-text-muted">
              Every driver on Avanti has been through document verification,
              identity matching, address confirmation, background screening,
              and rating history — before their profile is visible to you.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-admin-border bg-admin-card">
            {checks.map((line, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-admin-border px-5 py-4 last:border-0"
              >
                <span className="font-body text-[13px] text-admin-text-muted">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 font-body text-sm text-admin-text">{line}</span>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-admin-green-soft">
                  <Check className="h-3.5 w-3.5 text-admin-green-text" strokeWidth={2.5} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement continuum */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="mb-3 font-body text-[13px] font-medium uppercase tracking-[0.1em] text-admin-green-text">
          Engagements
        </p>
        <h2 className="mb-10 font-body text-3xl font-semibold leading-tight text-admin-text sm:text-4xl">
          From an hour to a career.
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {engagements.map(({ label, Icon, copy }) => (
            <div key={label} className="rounded-xl border border-admin-border bg-admin-card p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-admin-bg">
                <Icon className="h-4 w-4 text-admin-navy" strokeWidth={1.75} />
              </div>
              <p className="font-body text-sm font-medium text-admin-text">{label}</p>
              <p className="mt-2 font-body text-[13px] leading-relaxed text-admin-text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-admin-navy-2">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-admin-green">
              <span className="font-body text-[10px] font-semibold text-admin-navy-2">A</span>
            </div>
            <span className="font-body text-sm font-medium text-white">Avanti</span>
          </div>
          <div className="font-body text-[12px] text-admin-nav-text">
            v0.1 · Development build · © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}