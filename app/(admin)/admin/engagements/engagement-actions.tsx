'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const CANCELLABLE = ['draft', 'requested', 'accepted', 'contract_pending', 'confirmed', 'active', 'reassigning_pre', 'reassigning_mid'];

export function AdminEngagementActions({ engagementId, status }: { engagementId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [fullRefund, setFullRefund] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!CANCELLABLE.includes(status)) return <span className="font-body text-[11px] text-admin-text-muted">—</span>;

  async function cancel() {
    if (reason.trim().length < 3) return void toast.error('A reason is required.');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/engagements/${engagementId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', reason: reason.trim(), fullRefund }),
      });
      const b = (await res.json()) as { ok?: boolean; refund?: number; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Cancel failed');
      toast.success(Number(b.refund) > 0 ? `Cancelled — refunded ₦${Math.round(Number(b.refund)).toLocaleString('en-NG')}` : 'Cancelled');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-admin-border px-2.5 py-1 font-body text-[12px] font-medium text-red-600 hover:bg-admin-bg">
        Cancel / refund
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-admin-border bg-admin-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-body text-[12px] font-semibold text-admin-text">Cancel engagement</span>
        <button onClick={() => setOpen(false)} className="text-admin-text-muted hover:text-admin-text"><X className="h-3.5 w-3.5" /></button>
      </div>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (required)…" className="w-full rounded-lg border border-admin-border bg-admin-card px-2 py-1.5 font-body text-[13px] text-admin-text outline-none focus:border-admin-green" />
      <label className="mt-2 flex items-center gap-2 font-body text-[12px] text-admin-text">
        <input type="checkbox" checked={fullRefund} onChange={(e) => setFullRefund(e.target.checked)} /> Full refund (waive cancellation fee)
      </label>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-1 font-body text-[12px] text-admin-text-muted hover:text-admin-text">Back</button>
        <button onClick={cancel} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1 font-body text-[12px] font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm cancel
        </button>
      </div>
    </div>
  );
}
