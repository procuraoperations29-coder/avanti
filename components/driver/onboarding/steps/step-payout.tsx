'use client';

import type { OnboardingData } from '../wizard';
import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';

/**
 * Payout step.
 *
 * Nigerian bank details for payout. BVN optional but recommended (faster
 * verification and higher trust score).
 */

const NIGERIAN_BANKS = [
  'Access Bank',
  'Citibank',
  'Ecobank',
  'Fidelity Bank',
  'First Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Guaranty Trust Bank (GTBank)',
  'Heritage Bank',
  'Keystone Bank',
  'Kuda Bank',
  'OPay',
  'PalmPay',
  'Polaris Bank',
  'Providus Bank',
  'Stanbic IBTC Bank',
  'Standard Chartered',
  'Sterling Bank',
  'Titan Trust Bank',
  'Union Bank',
  'United Bank for Africa (UBA)',
  'Unity Bank',
  'Wema Bank',
  'Zenith Bank',
];

export function StepPayout({
  data,
  onUpdate,
}: {
  data: OnboardingData;
  onUpdate: (patch: OnboardingData) => void;
}) {
  const payout = data.payout ?? {};
  const set = (patch: Partial<typeof payout>) => onUpdate({ payout: patch });

  const legalName = data.identity?.full_name_legal;
  const nameMatches =
    legalName &&
    payout.account_holder_name &&
    payout.account_holder_name.trim().toLowerCase() === legalName.trim().toLowerCase();

  return (
    <div className="space-y-14">
      <p className="max-w-2xl font-display text-2xl leading-snug text-ink md:text-3xl">
        Where should we <em className="italic">pay you</em>?
      </p>

      <p className="max-w-2xl font-body leading-relaxed text-ink">
        Payouts run weekly, every Friday. Withholding tax (5%) is deducted before payout;
        you&apos;ll get a statement each cycle with the details.
      </p>

      {/* 01 · Bank */}
      <div>
        <SectionLabel>01 · Your bank</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Choose from the list
          </span>
          <select
            value={payout.bank_name ?? ''}
            onChange={(e) => set({ bank_name: e.target.value })}
            className="w-full border border-line-strong bg-paper px-3 py-2.5 font-body text-base text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Select a bank</option>
            {NIGERIAN_BANKS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* 02 · Account number */}
      <div>
        <SectionLabel>02 · Account number</SectionLabel>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Ten digits
          </span>
          <Input
            value={payout.account_number ?? ''}
            onChange={(e) =>
              set({ account_number: e.target.value.replace(/\D/g, '').slice(0, 10) })
            }
            className="font-mono text-lg tracking-wider"
            placeholder="0123456789"
            maxLength={10}
          />
        </label>
      </div>

      {/* 03 · Account holder */}
      <div>
        <SectionLabel>03 · Account holder name</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Exactly as it appears on your bank records. Must match your legal name.
        </p>
        <label className="mt-6 block max-w-md">
          <Input
            value={payout.account_holder_name ?? ''}
            onChange={(e) => set({ account_holder_name: e.target.value })}
            placeholder={legalName ?? 'Full name on your account'}
          />
          {legalName && payout.account_holder_name && !nameMatches && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-oxblood">
              Does not match your legal name from step 01
            </p>
          )}
          {nameMatches && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-green">
              Matches your legal name
            </p>
          )}
        </label>
      </div>

      {/* 04 · BVN */}
      <div>
        <SectionLabel>04 · BVN</SectionLabel>
        <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
          Your Bank Verification Number. Optional, but providing it speeds up verification
          and unlocks higher tier eligibility. We only use it to confirm account ownership.
        </p>
        <label className="mt-6 block max-w-md">
          <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Eleven digits
            <span className="ml-2 normal-case tracking-normal text-ink-faint">(optional)</span>
          </span>
          <Input
            value={payout.bvn ?? ''}
            onChange={(e) => set({ bvn: e.target.value.replace(/\D/g, '').slice(0, 11) })}
            className="font-mono text-lg tracking-wider"
            placeholder="12345678901"
            maxLength={11}
          />
        </label>
      </div>

      {/* Two banners: how payouts work + BVN incentive */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Payout cycle
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-ink">
            Every Friday, for engagements completed the prior week. Statement included. WHT
            deducted at source and remitted to FIRS on your behalf.
          </p>
        </div>

        <div className="border-l-2 border-ink bg-paper-2 px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            About BVN
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-ink">
            BVN cuts payout-onboarding time from days to minutes and is required for
            corporate assignments over ₦100,000. Skip for now if you prefer — we&apos;ll
            ask again later.
          </p>
        </div>
      </div>
    </div>
  );
}
