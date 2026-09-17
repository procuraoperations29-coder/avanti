'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { NIGERIAN_BANKS, type PayoutData } from '@/lib/onboarding/state';
import { cn } from '@/lib/utils/cn';

export function PayoutStepForm({ initialData }: { initialData: PayoutData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [bankName, setBankName] = useState(initialData.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(initialData.account_number ?? '');
  const [accountHolderName, setAccountHolderName] = useState(
    initialData.account_holder_name ?? ''
  );

  const canContinue =
    bankName.length > 0 &&
    /^\d{10}$/.test(accountNumber) &&
    accountHolderName.trim().length >= 4;

  const saveAndContinue = async () => {
    if (!canContinue) {
      toast.error('Please complete all bank details.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/driver/onboarding/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'payout',
          data: {
            bank_name: bankName,
            account_number: accountNumber,
            account_holder_name: accountHolderName.trim(),
          },
        }),
      });
      const body = (await res.json()) as { saved?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Save failed');
        return;
      }
      router.push('/driver/onboarding/step-review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {/* Bank */}
      <div className="mb-8">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Bank
        </label>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className={cn(
            'w-full border p-3 font-body text-sm text-ink focus:border-ink focus:outline-none',
            bankName ? 'border-line-strong bg-paper' : 'border-line-strong bg-paper-2 text-ink-faint'
          )}
          autoFocus
        >
          <option value="">Select your bank…</option>
          {NIGERIAN_BANKS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Account number */}
      <div className="mb-8">
        <label
          htmlFor="account_number"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Account number
        </label>
        <Input
          id="account_number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="1234567890"
          className="font-mono text-lg tracking-[0.15em]"
          inputMode="numeric"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          10 digits, NUBAN format
        </p>
      </div>

      {/* Account holder name */}
      <div className="mb-10">
        <label
          htmlFor="account_holder_name"
          className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted"
        >
          Account holder name
        </label>
        <Input
          id="account_holder_name"
          value={accountHolderName}
          onChange={(e) => setAccountHolderName(e.target.value)}
          placeholder="Adaobi Chidinma Okonkwo"
          className="font-body"
        />
        <p className="mt-2 font-mono text-[10px] text-ink-muted">
          Must match the name on your government ID
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-8">
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          Step 06 of 07
        </div>
        <Button
          onClick={saveAndContinue}
          disabled={busy || !canContinue}
          size="lg"
          className="min-w-[180px]"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
              Saving…
            </>
          ) : (
            <>
              Review
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
