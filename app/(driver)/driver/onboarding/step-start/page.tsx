import Link from 'next/link';
import { ArrowRight, Clock, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';

/**
 * Onboarding step 00 — welcome. Sets expectations, then Continue.
 */

export default function OnboardingStartPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 pb-20">
      <SectionLabel>Onboarding</SectionLabel>

      <h1 className="mt-4 font-display text-5xl leading-[1.05] text-ink md:text-6xl">
        Welcome to <em className="italic">Avanti.</em>
      </h1>

      <p className="mt-8 max-w-2xl font-body text-lg leading-relaxed text-ink">
        Let&apos;s get you verified. It takes about fifteen minutes, and once
        you&apos;re done our team reviews everything within one business day.
      </p>

      {/* What you'll need */}
      <div className="mt-12 border border-line bg-paper-2 p-8">
        <div className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          What you&apos;ll need
        </div>
        <ul className="space-y-4">
          {[
            {
              Icon: FileText,
              title: 'Government ID',
              body: 'Your NIN, passport, or voter&apos;s card — a photo of the front and back',
            },
            {
              Icon: FileText,
              title: 'Driver&apos;s licence',
              body: 'Both sides, in-date',
            },
            {
              Icon: FileText,
              title: 'Proof of address',
              body: 'A recent utility bill or tenancy agreement in your name (or a family member&apos;s)',
            },
            {
              Icon: ShieldCheck,
              title: 'Two references',
              body: 'People who&apos;ll vouch for you — previous employers, family, colleagues',
            },
            {
              Icon: FileText,
              title: 'Bank details',
              body: 'For weekly payouts, and monthly salary if you take permanent placements',
            },
          ].map(({ Icon, title, body }, i) => (
            <li key={i} className="flex items-start gap-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-line-strong bg-paper">
                <Icon className="h-4 w-4 text-ink" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <div className="font-body text-base text-ink">{title}</div>
                <div
                  className="mt-0.5 font-body text-sm text-ink-muted"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* What happens next */}
      <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-brass" strokeWidth={1.5} />
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            After you submit
          </div>
        </div>
        <p className="max-w-2xl font-body text-sm leading-relaxed text-ink">
          Our verification team reviews your documents within one business day. If
          anything needs clarification, we&apos;ll email you. Once approved, you show
          up on the roster and can start taking bookings — or start looking at
          permanent placements.
        </p>
      </div>

      {/* Ready */}
      <div className="mt-10 flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 00 · Ready
        </div>
        <Link
          href="/driver/onboarding/step-identity"
          className="inline-flex items-center gap-2 border border-ink bg-ink px-6 py-3 font-body text-sm text-paper transition-colors hover:bg-ink-2"
        >
          Begin
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
