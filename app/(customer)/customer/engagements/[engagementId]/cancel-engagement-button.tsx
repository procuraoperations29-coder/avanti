'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { quoteCancellation, type CancelPolicy } from '@/lib/engagement/cancellation';

function naira(n: number) { return `₦${Math.round(n).toLocaleString('en-NG')}`; }

export function CancelEngagement({
  engagementId,
  startsAt,
  amountPaid,
  isPaid,
  policy,
}: {
  engagementId: string;
  startsAt: string;
  amountPaid: number;
  isPaid: boolean;
  policy: CancelPolicy;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const q = quoteCancellation(startsAt, isPaid ? amountPaid : 0, policy);
  const hrs = Math.max(0, Math.round(q.hoursUntilStart));

  async function submit() {
    if (reason.trim().length < 3) return void toast.error('Please give a reason for cancelling.');
    setBusy(true);
    try {
      const res = await fetch(`/api/customer/engagements/${engagementId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const b = (await res.json()) as { ok?: boolean; refund?: number; fee?: number; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not cancel');
      toast.success(Number(b.refund) > 0 ? `Cancelled — refund of ${naira(Number(b.refund))} on the way` : 'Engagement cancelled');
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 font-body text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10"
      >
        Cancel this engagement
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-body text-sm font-semibold text-admin-text">Cancel engagement</h3>
        <button onClick={() => setOpen(false)} className="text-admin-text-muted hover:text-admin-text"><X className="h-4 w-4" /></button>
      </div>

      <label className="block">
        <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Reason for cancelling (required)</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Tell us why you're cancelling…"
          className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
        />
      </label>

      <div className="mt-3 rounded-xl bg-admin-bg/60 p-3 font-body text-[12px] text-admin-text-muted">
        {hrs >= 24 ? `${Math.floor(hrs / 24)}d ${hrs % 24}h` : `${hrs}h`} until start.{' '}
        {q.feeRate === 0 ? (
          <span className="text-admin-green-text">Free cancellation — no fee.</span>
        ) : (
          <>A {Math.round(q.feeRate * 1000) / 10}% cancellation fee applies{isPaid ? <> ({naira(q.fee)}).</> : '.'}</>
        )}
        {isPaid && q.refund > 0 && <> You&apos;ll be refunded <b className="text-admin-text">{naira(q.refund)}</b>.</>}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 font-body text-sm text-admin-text-muted hover:text-admin-text">Keep it</button>
        <button onClick={submit} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 font-body text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cancel engagement
        </button>
      </div>
    </div>
  );
}
