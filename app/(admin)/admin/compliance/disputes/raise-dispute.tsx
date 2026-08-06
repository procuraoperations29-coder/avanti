'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const CATEGORIES = ['no_show', 'late_arrival', 'service_quality', 'overtime_disagreement', 'vehicle_damage', 'financial', 'contract_breach', 'safety_incident', 'misconduct', 'fraud'];
const SEL = 'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

export function RaiseDispute({ engagements }: { engagements: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [engagementId, setEngagementId] = useState('');
  const [raisedBy, setRaisedBy] = useState<'customer' | 'driver'>('customer');
  const [category, setCategory] = useState('service_quality');
  const [severity, setSeverity] = useState('medium');
  const [summary, setSummary] = useState('');

  async function submit() {
    if (!engagementId) return toast.error('Pick the engagement this is about.');
    if (!summary.trim()) return toast.error('Add a short summary of the complaint.');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/disputes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engagementId, raisedBy, category, severity, summary: summary.trim() }),
      });
      const b = (await res.json()) as { ok?: boolean; id?: string; caseNumber?: string; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not open the case');
      toast.success(`Case ${b.caseNumber} opened`);
      setOpen(false); setSummary(''); setEngagementId('');
      if (b.id) router.push(`/admin/compliance/disputes/${b.id}`);
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the case');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-4 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2">
        <Plus className="h-4 w-4" strokeWidth={2} /> Open a case
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
      <p className="mb-4 font-display text-[15px] font-semibold text-admin-text">Open a dispute</p>
      {engagements.length === 0 ? (
        <p className="font-body text-sm text-admin-text-muted">No engagements to attach a dispute to yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1 block font-body text-[12px] text-admin-text-muted">Engagement</span>
            <select value={engagementId} onChange={(e) => setEngagementId(e.target.value)} className={SEL}>
              <option value="">Select the engagement…</option>
              {engagements.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select></label>
          <label><span className="mb-1 block font-body text-[12px] text-admin-text-muted">Raised by</span>
            <select value={raisedBy} onChange={(e) => setRaisedBy(e.target.value as 'customer' | 'driver')} className={SEL}>
              <option value="customer">Customer</option><option value="driver">Driver</option>
            </select></label>
          <label><span className="mb-1 block font-body text-[12px] text-admin-text-muted">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={SEL}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select></label>
          <label><span className="mb-1 block font-body text-[12px] text-admin-text-muted">Severity</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={SEL}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select></label>
          <label className="sm:col-span-2"><span className="mb-1 block font-body text-[12px] text-admin-text-muted">What happened?</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Summary of the complaint as reported…" className={SEL} /></label>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <button onClick={submit} disabled={busy || engagements.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Open case
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="rounded-lg px-4 py-2 font-body text-sm text-admin-text-muted hover:text-admin-text">Cancel</button>
      </div>
    </div>
  );
}
