'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PenLine } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

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
