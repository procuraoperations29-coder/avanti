'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { StampBadge } from '@/components/avanti/stamp-badge';

/**
 * Start step — the first driver moment.
 *
 * Editorial welcome, ordinal list of "what we'll ask for", and a
 * "what happens after" section that shows the credentials they'll earn.
 * Ends with a small save note.
 */

const REQUIREMENTS = [
  {
    title: 'Government-issued ID',
    detail: "NIN slip, driver's licence, or international passport",
  },
  {
    title: 'Driving licence',
    detail: 'Photo of the card, front and back',
  },
  {
    title: 'Proof of address',
    detail: 'Recent utility bill, bank statement, or tenancy agreement',
  },
  {
    title: 'Background check consent',
    detail: 'A single tick — we run the check on our end',
  },
  {
    title: 'A few facts about your experience',
    detail: 'Years driving, vehicle classes, languages, service radius',
  },
  {
    title: 'Bank account for payouts',
    detail: 'Where should we send your earnings?',
  },
];

export function StepStart(_props: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  return (
    <div className="space-y-12">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        You&apos;re minutes away from being <em className="italic">verified</em> and taking bookings.
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        We&apos;ll ask for a few documents to confirm your identity, licence, address, and
        consent to a background check. It usually takes ten minutes if you have your
        documents to hand.
      </p>

      {/* What we'll ask for */}
      <div>
        <SectionLabel>What we&apos;ll ask for</SectionLabel>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {REQUIREMENTS.map((item, i) => (
            <li key={item.title} className="flex items-baseline gap-6 py-5">
              <div className="w-8 shrink-0 font-display text-2xl leading-none text-brass">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="font-body text-base text-ink">{item.title}</div>
                <div className="mt-1 font-body text-sm text-ink-muted">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* After you submit */}
      <div>
        <SectionLabel>After you submit</SectionLabel>
        <p className="mt-6 max-w-2xl font-body leading-relaxed text-ink">
          Our verification team reviews every submission personally — typically within
          one business day. You&apos;ll be notified when the decision is made. The tier
          you&apos;re placed in depends on what we&apos;re able to verify.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <StampBadge label="Identity verified" />
          <StampBadge label="Licence confirmed" />
          <StampBadge label="Background checked" />
          <StampBadge label="Executive tier eligible" variant="filled" />
        </div>
      </div>

      {/* Reassurance */}
      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Heads up
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
          Your progress saves automatically. Step away and come back on any device —
          you&apos;ll pick up right where you left off.
        </p>
      </div>
    </div>
  );
}
