'use client';

import { Check, X } from 'lucide-react';
import { SectionLabel } from '@/components/avanti/section-label';
import { SpecRow } from '@/components/avanti/spec-row';
import { cn } from '@/lib/utils/cn';
import type { StepProps } from '../wizard';

export function StepReview({ data }: StepProps) {
  const checks = [
    {
      label: 'Identity documents',
      complete: Boolean(data.identity.idFrontDocumentId && data.identity.selfieDocumentId),
    },
    {
      label: "Driver's licence",
      complete: Boolean(data.licence.licenceFrontDocumentId && data.licence.licenceNumber),
    },
    {
      label: 'Proof of address',
      complete: Boolean(data.address.addressProofDocumentId),
    },
    {
      label: 'Background check consent',
      complete: Boolean(data.background.consentGiven),
    },
    {
      label: 'Experience details',
      complete: Boolean(
        (data.experience.languages?.length ?? 0) > 0 &&
          (data.experience.vehicleClasses?.length ?? 0) > 0 &&
          (data.experience.transmissionTypes?.length ?? 0) > 0
      ),
    },
    {
      label: 'Payout method',
      complete:
        data.payout.accountKind === 'bank_transfer'
          ? Boolean(data.payout.bankName && data.payout.accountNumber && data.payout.accountName)
          : Boolean(data.payout.mobileMoneyProvider && data.payout.msisdn),
    },
  ];

  const allComplete = checks.every((c) => c.complete);

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Checklist</SectionLabel>
        <ul className="mt-3 border-t border-line">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex items-center justify-between border-b border-line py-3"
            >
              <span className="font-body text-sm text-ink">{c.label}</span>
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center border',
                  c.complete ? 'border-green bg-green text-paper' : 'border-oxblood/40 text-oxblood'
                )}
              >
                {c.complete ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <SectionLabel>Summary</SectionLabel>
        <dl className="mt-3">
          <SpecRow label="Years driving" value={data.experience.yearsExperience ?? '—'} />
          <SpecRow label="Languages" value={(data.experience.languages ?? []).join(', ') || '—'} />
          <SpecRow
            label="Vehicle classes"
            value={(data.experience.vehicleClasses ?? []).join(', ') || '—'}
          />
          <SpecRow label="Home city" value={data.experience.homeBaseCity ?? '—'} />
          <SpecRow label="Service radius" value={data.experience.serviceRadiusKm ? `${data.experience.serviceRadiusKm} km` : '—'} />
          <SpecRow
            label="Payout"
            value={
              data.payout.accountKind === 'bank_transfer'
                ? `${data.payout.bankName ?? ''} • ****${(data.payout.accountNumber ?? '').slice(-4)}`
                : `${data.payout.mobileMoneyProvider ?? ''} • ****${(data.payout.msisdn ?? '').slice(-4)}`
            }
          />
        </dl>
      </div>

      {!allComplete && (
        <div className="border-l-2 border-oxblood bg-paper-2 px-4 py-3">
          <p className="font-body text-sm text-ink">
            Some steps are incomplete. Go back and finish the ones marked with an ✕ before
            submitting.
          </p>
        </div>
      )}

      {allComplete && (
        <div className="border-l-2 border-green bg-green-soft px-4 py-3">
          <p className="font-body text-sm text-ink">
            You&apos;re ready. Submitting will queue your account for review — typically a business
            day. You&apos;ll get a notification when the decision is made.
          </p>
        </div>
      )}
    </div>
  );
}
