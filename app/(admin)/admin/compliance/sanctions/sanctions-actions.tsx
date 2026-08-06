'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

async function post(body: Record<string, unknown>) {
  const res = await fetch('/api/admin/sanctions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
  if (!res.ok) throw new Error(b.message ?? b.error ?? 'Action failed');
}

export function RecordSanction({ userId, driverId }: { userId: string; driverId: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  async function act(status: string, months: number | undefined, tag: string, ok: string) {
    setBusy(tag);
    try {
      await post({ userId, driverId, status, monthsUntilNext: months });
      toast.success(ok);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button onClick={() => act('clear', 12, 'clear', 'Marked clear · re-check in 12 months')} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-green-text hover:bg-admin-bg disabled:opacity-50">
        {busy === 'clear' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />} Clear
      </button>
      <button onClick={() => act('hit', 0, 'hit', 'Flagged as a hit')} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50">
        {busy === 'hit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />} Hit
      </button>
      <button onClick={() => act('needs_review', 0, 'review', 'Flagged for review')} disabled={busy !== ''} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
        {busy === 'review' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />} Re-check
      </button>
    </div>
  );
}

export function EnrollDriver({ drivers }: { drivers: { userId: string; driverId: string; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState('');
  async function enroll() {
    const d = drivers.find((x) => x.driverId === sel);
    if (!d) return;
    setBusy(true);
    try {
      await post({ userId: d.userId, driverId: d.driverId, status: 'pending' });
      toast.success(`${d.name} added to screening`);
      setSel('');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enroll');
    } finally {
      setBusy(false);
    }
  }
  if (drivers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
        <option value="">Add a driver to screening…</option>
        {drivers.map((d) => <option key={d.driverId} value={d.driverId}>{d.name}</option>)}
      </select>
      <button onClick={enroll} disabled={!sel || busy} className="inline-flex items-center gap-1.5 rounded-xl bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2} />} Enroll
      </button>
    </div>
  );
}
