'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * Backfills driver_payout_methods for already-submitted drivers whose
 * insert silently failed at onboarding time (wrong column names — fixed
 * now, but drivers can't retrigger it themselves since the review/submit
 * step redirects them away once already submitted).
 */
export function RetryPayoutMethodsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/finance/payout-methods/backfill', { method: 'POST' });
      const body = (await res.json()) as {
        backfilled?: number;
        skipped?: number;
        alreadyHadMethod?: number;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Could not retry payout methods');
        return;
      }
      if (body.backfilled && body.backfilled > 0) {
        toast.success(`Fixed ${body.backfilled} driver${body.backfilled === 1 ? '' : 's'} — re-run the batch now.`);
        router.refresh();
      } else {
        toast.error(
          body.skipped
            ? `No drivers fixed — ${body.skipped} still missing payout details entirely.`
            : 'No drivers needed fixing.'
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not retry payout methods');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={retry} disabled={busy} variant="secondary" size="sm">
      {busy ? (
        <>
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
          Checking…
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
          Retry payout methods
        </>
      )}
    </Button>
  );
}
