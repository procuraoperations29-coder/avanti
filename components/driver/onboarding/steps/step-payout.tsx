'use client';

import { SectionLabel } from '@/components/avanti/section-label';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import type { StepProps } from '../wizard';

export function StepPayout({ data, update }: StepProps) {
  const kind = data.payout.accountKind ?? 'bank_transfer';

  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-ink-muted">
        This is where we send your earnings. You can add more methods later.
      </p>

      <div>
        <SectionLabel>Payout method</SectionLabel>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { value: 'bank_transfer' as const, label: 'Bank transfer' },
            { value: 'mobile_money' as const, label: 'Mobile money' },
          ].map((opt) => {
            const selected = kind === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ payout: { accountKind: opt.value } })}
                className={cn(
                  'border p-3 text-left font-body text-sm transition-colors',
                  selected
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line-strong bg-paper-2 text-ink hover:bg-paper-3'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {kind === 'bank_transfer' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="bank">Bank name</Label>
            <Input
              id="bank"
              className="mt-2"
              placeholder="Access Bank"
              value={data.payout.bankName ?? ''}
              onChange={(e) => update({ payout: { bankName: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="acct-no">Account number</Label>
            <Input
              id="acct-no"
              inputMode="numeric"
              className="mt-2 font-mono"
              placeholder="0123456789"
              value={data.payout.accountNumber ?? ''}
              onChange={(e) =>
                update({ payout: { accountNumber: e.target.value.replace(/\D/g, '') } })
              }
            />
          </div>
          <div>
            <Label htmlFor="acct-name">Account name</Label>
            <Input
              id="acct-name"
              className="mt-2"
              placeholder="ADA OKONKWO"
              value={data.payout.accountName ?? ''}
              onChange={(e) => update({ payout: { accountName: e.target.value } })}
            />
            <p className="mt-1 font-body text-xs text-ink-muted">
              Must match the name on your ID exactly.
            </p>
          </div>
        </div>
      )}

      {kind === 'mobile_money' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="mm-provider">Provider</Label>
            <Input
              id="mm-provider"
              className="mt-2"
              placeholder="MTN MoMo"
              value={data.payout.mobileMoneyProvider ?? ''}
              onChange={(e) => update({ payout: { mobileMoneyProvider: e.target.value } })}
            />
          </div>
          <div>
            <Label htmlFor="msisdn">Phone number linked to the account</Label>
            <Input
              id="msisdn"
              inputMode="numeric"
              className="mt-2 font-mono"
              placeholder="+234 801 234 5678"
              value={data.payout.msisdn ?? ''}
              onChange={(e) => update({ payout: { msisdn: e.target.value } })}
            />
          </div>
        </div>
      )}

      <div className="border-l-2 border-brass bg-brass-soft px-4 py-3">
        <p className="font-body text-sm text-ink">
          <span className="font-mono text-xs uppercase tracking-wider">Note</span> — we&apos;ll
          send a small test deposit before your first real payout to confirm the account
          works.
        </p>
      </div>
    </div>
  );
}
