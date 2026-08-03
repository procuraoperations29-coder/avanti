'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export function InvoiceMarkPaid({ invoiceId, kind }: { invoiceId: string; kind: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    if (!window.confirm('Mark this invoice paid (bank transfer confirmed)?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/corporate/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(kind === 'upfront' ? 'Paid — drivers activated' : 'Marked paid');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      disabled={busy}
      onClick={markPaid}
      className="inline-flex items-center gap-1 rounded-xl border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text shadow-admin-sm transition-colors hover:bg-admin-bg disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
      Mark paid
    </button>
  );
}
