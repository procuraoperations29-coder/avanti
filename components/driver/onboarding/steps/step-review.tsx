'use client';

import { Check, X } from 'lucide-react';
import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { cn } from '@/lib/utils/cn';

/**
 * Review step — the last thing a driver sees before their submission
 * queues for verification.
 *
 * Editorial polish: ordinal check-list with green complete / muted
 * incomplete, a summary of key facts, and a state-aware banner
 * (green "Ready" if all complete, oxblood "Almost there" if not).
 */

export function StepReview({ data }: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const checks: { key: string; label: string; complete: boolean }[] = [
    {
      key: 'identity',
      label: 'Identity documents uploaded',
      complete: Boolean(data.identity?.id_document_id && data.identity?.selfie_document_id),
    },
    {
      key: 'licence',
      label: 'Driving licence details provided',
      complete: Boolean(data.licence?.document_id && data.licence?.licence_number),
    },
    {
      key: 'address',
      label: 'Address confirmed',
      complete: Boolean(data.address?.document_id && data.address?.line),
    },
    {
      key: 'background',
      label: 'Background check consent given',
      complete: Boolean(data.background?.consent_given),
    },
    {
      key: 'experience',
      label: 'Experience details completed',
      complete: Boolean(
        data.experience?.years_experience != null &&
        (data.experience?.vehicle_class_experience?.length ?? 0) > 0
      ),
    },
    {
      key: 'payout',
      label: 'Payout account provided',
      complete: Boolean(
        data.payout?.bank_name &&
        data.payout?.account_number &&
        data.payout?.account_holder_name
      ),
    },
  ];

  const allComplete = checks.every((c) => c.complete);
  const completeCount = checks.filter((c) => c.complete).length;

  return (
    <div className="space-y-12">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        {allComplete ? (
          <>
            <em className="italic">Ready</em> to submit.
          </>
        ) : (
          <>
            <em className="italic">Almost</em> ready.
          </>
        )}
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        {allComplete
          ? "You've completed every step. When you're ready, submit for verification. Our team usually reviews within one business day."
          : `You've completed ${completeCount} of ${checks.length} steps. Finish the incomplete ones before submitting.`}
      </p>

      {/* Checklist */}
      <div>
        <SectionLabel>What we&apos;ll verify</SectionLabel>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {checks.map((c, i) => (
            <li
              key={c.key}
              className="flex items-baseline justify-between gap-4 py-5"
            >
              <div className="flex items-baseline gap-6">
                <div
                  className={cn(
                    'w-8 shrink-0 font-display text-2xl leading-none',
                    c.complete ? 'text-brass' : 'text-ink-faint'
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="font-body text-base text-ink">{c.label}</div>
              </div>
              <div className="pt-1">
                {c.complete ? (
                  <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-green">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Complete
                  </div>
                ) : (
                  <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                    Incomplete
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Summary */}
      {(data.identity?.full_name_legal || data.experience?.years_experience) && (
        <div>
          <SectionLabel>What we know about you</SectionLabel>
          <dl className="mt-6 space-y-4">
            {data.identity?.full_name_legal && (
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Legal name
                </dt>
                <dd className="font-body text-sm text-ink">{data.identity.full_name_legal}</dd>
              </div>
            )}
            {data.licence?.licence_number && (
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Licence number
                </dt>
                <dd className="font-mono text-sm text-ink">{data.licence.licence_number}</dd>
              </div>
            )}
            {data.experience?.years_experience != null && (
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Experience
                </dt>
                <dd className="font-body text-sm text-ink">
                  {data.experience.years_experience} year
                  {data.experience.years_experience === 1 ? '' : 's'}
                </dd>
              </div>
            )}
            {(data.experience?.vehicle_class_experience?.length ?? 0) > 0 && (
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Vehicle classes
                </dt>
                <dd className="text-right font-body text-sm capitalize text-ink">
                  {data.experience!.vehicle_class_experience!.join(', ')}
                </dd>
              </div>
            )}
            {data.payout?.bank_name && (
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Payout account
                </dt>
                <dd className="font-body text-sm text-ink">
                  {data.payout.bank_name} · ****{data.payout.account_number?.slice(-4) ?? '****'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Status banner */}
      {allComplete ? (
        <div className="border-l-2 border-green bg-green-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
            Ready
          </div>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
            Submitting will queue your account for verification. Our team reviews every
            submission personally — typically within one business day. You&apos;ll be
            notified as soon as the decision is made.
          </p>
        </div>
      ) : (
        <div className="border-l-2 border-oxblood bg-paper-2 px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-oxblood">
            Almost there
          </div>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
            Some steps are incomplete. Use the <span className="font-semibold">Back</span> button
            to return to the ones marked incomplete above, then come back here to submit.
          </p>
        </div>
      )}
    </div>
  );
}
