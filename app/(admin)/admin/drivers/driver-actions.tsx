'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Ban, RotateCcw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function DriverActions({ driverId, suspended }: { driverId: string; suspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: 'suspend' | 'unsuspend') {
    const reason = action === 'suspend' ? (window.prompt('Reason for suspension (optional):') ?? '') : undefined;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Action failed');
      toast.success(action === 'suspend' ? 'Driver suspended' : 'Driver reinstated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return suspended ? (
    <button onClick={() => act('unsuspend')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-admin-green-text hover:bg-admin-bg disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />} Unsuspend
    </button>
  ) : (
    <button onClick={() => act('suspend')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-admin-amber-text hover:bg-admin-bg disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" strokeWidth={2} />} Suspend
    </button>
  );
}
