'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { DocumentUpload } from '../document-upload';

/**
 * Address step.
 *
 * Proof-of-address upload + structured address fields.
 */

const QUALIFYING_DOCS = [
  { label: 'Utility bill', detail: 'Electricity, water, waste — dated within 3 months' },
  { label: 'Bank statement', detail: 'Any Nigerian bank, with your address printed' },
  { label: 'Tenancy agreement', detail: 'Signed lease showing the address' },
  { label: 'Local government levy', detail: 'LGA tax or rate document' },
];

export function StepAddress({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const address = data.address ?? {};
  const set = (patch: Partial<typeof address>) => onUpdate({ address: patch });

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        Where you&apos;re <em className="italic">based.</em>
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        Address verification is what separates our T1 and T2 tiers. Customers looking for
        someone reliable filter on this — so it&apos;s worth taking a moment to get right.
      </p>

      {/* 01 · Qualifying docs */}
      <div>
        <SectionLabel>01 · What we accept</SectionLabel>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {QUALIFYING_DOCS.map((doc, i) => (
            <li key={doc.label} className="flex items-baseline gap-6 py-4">
              <div className="w-8 shrink-0 font-display text-xl leading-none text-brass">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1">
                <div className="font-body text-base text-ink">{doc.label}</div>
                <div className="mt-1 font-body text-sm text-ink-muted">{doc.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 02 · Upload */}
      <div>
        <SectionLabel>02 · Upload your proof of address</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Any one of the documents above. Make sure your name and full address are
          legible.
        </p>
        <div className="mt-6">
          <DocumentUpload
            kind="address"
            currentDocumentId={address.document_id}
            onUploaded={(id: string) => set({ document_id: id })}
          />
        </div>
      </div>

      {/* 03 · Address */}
      <div>
        <SectionLabel>03 · Your address</SectionLabel>
        <div className="mt-6 grid max-w-2xl gap-4">
          <label className="block">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Street address
            </span>
            <Input
              value={address.line ?? ''}
              onChange={(e) => set({ line: e.target.value })}
              placeholder="65 Norman Williams Street"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                City / area
              </span>
              <Input
                value={address.city ?? ''}
                onChange={(e) => set({ city: e.target.value })}
                placeholder="Ikoyi"
              />
            </label>

            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                State
              </span>
              <Input
                value={address.state ?? ''}
                onChange={(e) => set({ state: e.target.value })}
                placeholder="Lagos"
              />
            </label>
          </div>

          <label className="block max-w-xs">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Postal code
              <span className="ml-2 normal-case tracking-normal text-ink-faint">(optional)</span>
            </span>
            <Input
              value={address.postal_code ?? ''}
              onChange={(e) => set({ postal_code: e.target.value })}
              className="font-mono"
              placeholder="101233"
            />
          </label>
        </div>
      </div>

      {/* Banner */}
      <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
          Why address matters
        </div>
        <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-ink">
          The address you enter is where our correspondence goes — verification results,
          payout summaries, tax documents. Customers never see it. What they do see:
          &ldquo;Address verified&rdquo; on your dossier once we&apos;ve confirmed.
        </p>
      </div>
    </div>
  );
}
