'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function ReleaseBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const release = async () => {
    if (
      !window.confirm(
        'Release this batch? All pending payouts will be marked completed. This cannot be undone from the UI.'
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/finance/batches/${batchId}/release`, {
        method: 'POST',
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Release failed');
        return;
      }
      toast.success('Batch released');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Release failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={release} disabled={busy} size="lg">
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />
          Releasing…
        </>
      ) : (
        <>
          <Send className="mr-2 h-4 w-4" strokeWidth={1.5} />
          Release batch
        </>
      )}
    </Button>
  );
}
