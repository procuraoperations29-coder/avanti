'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function OrgActions({ orgId, status }: { orgId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: string, msg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(msg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'pending_verification' && (
        <button
          disabled={busy}
          onClick={() => act('activate', 'Organisation activated')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-3 py-1.5 font-body text-[12px] font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
          Activate
        </button>
      )}
      {status === 'active' && (
        <button
          disabled={busy}
          onClick={() => act('suspend', 'Organisation suspended')}
          className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {status === 'suspended' && (
        <button
          disabled={busy}
          onClick={() => act('reactivate', 'Organisation reactivated')}
          className="font-body text-[12px] font-medium text-admin-green-text hover:text-admin-green disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
