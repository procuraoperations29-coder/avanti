'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function OvertimeActions({ overtimeId }: { overtimeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: 'approve' | 'reject') {
    setBusy(true);
    try {
      const res = await fetch(`/api/corporate/overtime/${overtimeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(action === 'approve' ? 'Overtime approved' : 'Overtime rejected');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={busy}
        onClick={() => act('approve')}
        className="inline-flex items-center gap-1 rounded-xl bg-admin-green px-3 py-1.5 font-body text-[12px] font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
        Approve
      </button>
      <button
        disabled={busy}
        onClick={() => act('reject')}
        className="inline-flex items-center gap-1 rounded-xl border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text-muted transition-colors hover:text-red-600 disabled:opacity-50"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        Reject
      </button>
    </div>
  );
}
