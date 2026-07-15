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
      const body = (await res.json()) as { batchId?: string; error?: string; message?: string };
      if (!res.ok || !body.batchId) {
        toast.error(body.message ?? body.error ?? 'Could not create batch');
        return;
      }
      toast.success('Batch created');
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
