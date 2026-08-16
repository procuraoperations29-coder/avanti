'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PenLine, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function RegenerateButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    if (!window.confirm('Rebuild this contract from the driver’s current onboarding data? Signatures are kept.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/regenerate`, { method: 'POST' });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not regenerate');
      toast.success('Contract regenerated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not regenerate');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />} Regenerate
    </button>
  );
}

export function CountersignButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/contracts/${contractId}/countersign`, { method: 'POST' });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not countersign');
      toast.success('Countersigned by Avanti');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not countersign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={go} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-admin-navy px-3 py-1.5 font-body text-[12px] font-medium text-white shadow-admin-sm hover:bg-admin-navy-2 disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" strokeWidth={2} />} Countersign as Avanti
    </button>
  );
}
