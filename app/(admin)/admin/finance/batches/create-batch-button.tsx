'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function CreateBatchButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!window.confirm('Create a batch containing all unbatched completed engagements?'))
      return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/finance/batches', { method: 'POST' });
      const body = (await res.json()) as {
        batchId?: string;
        payoutCount?: number;
        totalGross?: number;
        skippedCount?: number;
        skippedReason?: string | null;
        error?: string;
        message?: string;
      };
      if (!res.ok || !body.batchId) {
        toast.error(body.message ?? body.error ?? 'Could not create batch');
        return;
      }

      if (body.payoutCount === 0) {
        toast.error(
          body.skippedCount
            ? `Batch created but empty — ${body.skippedCount} engagement(s) skipped because the driver has no payout method on file.`
            : 'Batch created but empty — no eligible engagements found.'
        );
      } else if (body.skippedCount) {
        toast.success(
          `Batch created with ${body.payoutCount} payout(s). ${body.skippedCount} engagement(s) skipped — driver has no payout method on file.`
        );
      } else {
        toast.success('Batch created');
      }

      router.push(`/admin/finance/batches/${body.batchId}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create batch');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={create} disabled={busy || disabled} size="lg">
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
          Building…
        </>
      ) : (
        <>
          <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Create new batch
        </>
      )}
    </Button>
  );
}
