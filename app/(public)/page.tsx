import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { SectionLabel } from '@/components/avanti/section-label';
import { cn } from '@/lib/utils/cn';

/**
 * Public landing page.
 *
 * The hero is a thesis, not a value-prop pitch (Phase 2 §1.3 principle 1).
 * The seven-checks numbered list encodes a real sequence, so the numbering
 * earns its place.
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
    { label: 'Hourly', copy: 'A meeting, a school run, an evening out.' },
    { label: 'Full-day', copy: 'A wedding, a business trip, a full itinerary.' },
    { label: 'Monthly', copy: 'A regular driver on your terms and schedule.' },
    { label: 'Permanent', copy: 'A full employment engagement, contracts and payroll handled.' },
  ];

  return (
    <div className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-2xl tracking-tight text-ink">avanti</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
              a.001
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-px w-8 bg-ink" />
          <SectionLabel>Established 2026 · Lagos, Nigeria</SectionLabel>
        </div>

        <h1 className="mb-8 font-display leading-[0.95] tracking-tight text-ink text-[clamp(3rem,8vw,6.5rem)]">
          The driver is the hire.
          <br />
          <em className="italic">Not the ride.</em>
        </h1>

        <p className="mb-10 max-w-2xl font-body text-lg leading-relaxed text-ink-muted sm:text-xl">
          Hire a professional driver — background-checked, insurance-aware,
          contract-covered — to operate your own vehicle. By the hour, the
          day, the month, or as a permanent hire.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/sign-up/customer" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
            Find a driver <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link href="/sign-up/corporate" className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}>
            For business
          </Link>
        </div>
      </section>

      {/* Vetting */}
      <section className="border-t border-line bg-paper-2">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <SectionLabel>Vetting</SectionLabel>
            <h2 className="mb-6 mt-4 font-display text-4xl leading-tight text-ink sm:text-5xl">
              Seven checks before you meet.
            </h2>
            <p className="font-body leading-relaxed text-ink-muted">
              Every driver on Avanti has been through document verification,
              identity matching, address confirmation, background screening,
              and rating history — before their profile is visible to you.
            </p>
          </div>
          <div className="font-mono text-sm text-ink">
            {checks.map((line, i) => (
              <div key={i} className="flex items-start gap-4 border-b border-line py-3">
                <span className="min-w-[24px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">{line}</span>
                <Check className="ml-auto mt-1 h-3.5 w-3.5 text-green" strokeWidth={2.5} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engagement continuum */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-px w-8 bg-ink" />
          <SectionLabel>Engagements</SectionLabel>
        </div>
        <h2 className="mb-10 font-display text-4xl leading-tight text-ink sm:text-5xl">
          From an hour <em className="italic">to a career.</em>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {engagements.map((item) => (
            <div key={item.label} className="border border-line bg-paper p-5">
              <SectionLabel>{item.label}</SectionLabel>
              <p className="mt-3 font-body text-sm leading-relaxed text-ink-muted">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <div>
            <div className="font-display text-2xl">avanti</div>
            <div className="mt-1 font-mono text-xs uppercase tracking-widest text-ink-faint">
              Professional drivers, on paper.
            </div>
          </div>
          <div className="font-mono text-xs uppercase tracking-wider text-ink-faint">
            v0.1 · Development build · © 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
