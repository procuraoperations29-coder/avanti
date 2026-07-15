'use client';

import { Check } from 'lucide-react';
import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { cn } from '@/lib/utils/cn';

/**
 * Background check consent — the trust moment.
 *
 * Explains what we check, then a single considered checkbox with
 * timestamped consent.
 */

const CHECKS = [
  { label: 'Criminal record', detail: 'Nigerian court records for any convictions' },
  { label: 'Sanctions lists', detail: 'International watch lists and PEP databases' },
  { label: 'Driving record', detail: 'Traffic offences and licence status via FRSC' },
];

export function StepBackground({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const bg = data.background ?? {};
  const consented = Boolean(bg.consent_given);

  const toggle = () => {
    onUpdate({
      background: {
        consent_given: !consented,
        consent_at: !consented ? new Date().toISOString() : undefined,
      },
    });
  };

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        Consent to a <em className="italic">background check.</em>
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        Every driver on Avanti is background-checked. It runs after you submit and takes
        24-48 hours. You don&apos;t need to do anything — we handle it.
      </p>

      {/* What we check */}
      <div>
        <SectionLabel>What we look into</SectionLabel>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {CHECKS.map((c, i) => (
            <li key={c.label} className="flex items-baseline gap-6 py-5">
              <div className="w-8 shrink-0 font-display text-2xl leading-none text-brass">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="font-body text-base text-ink">{c.label}</div>
                <div className="mt-1 font-body text-sm text-ink-muted">{c.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Consent action */}
      <div>
        <SectionLabel>Your consent</SectionLabel>
        <button
          onClick={toggle}
          className={cn(
            'mt-6 flex w-full items-start gap-4 border-2 p-6 text-left transition-colors',
            consented
              ? 'border-green bg-green-soft'
              : 'border-line-strong bg-paper-2 hover:bg-paper-3'
          )}
        >
          <div
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border-2 transition-colors',
              consented ? 'border-green bg-green' : 'border-line-strong bg-paper'
            )}
          >
            {consented && <Check className="h-4 w-4 text-paper" strokeWidth={3} />}
          </div>
          <div className="flex-1">
            <div className="font-body text-base leading-relaxed text-ink">
              I authorise Avanti to conduct the background check described above. I confirm
              the information I&apos;ve provided is accurate and I understand that any
              misrepresentation may result in my application being rejected or, if
              discovered later, my account suspended.
            </div>
            {consented && bg.consent_at && (
              <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-green">
                Consented {new Date(bg.consent_at).toLocaleString()}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Turnaround note */}
      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Turnaround
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
          The check runs automatically after submission. Most come back within 24 hours.
          You&apos;ll be notified as soon as the result is in — no need to check back.
        </p>
      </div>
    </div>
  );
}
