'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, Gavel, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const STATUSES = ['raised', 'triaged', 'awaiting_respondent', 'under_review', 'mediation', 'escalated', 'resolved_by_agreement', 'resolved_by_decision', 'withdrawn'];
const OUTCOMES = ['full_refund', 'partial_refund', 'credit_apology', 're_invoice', 'no_action', 'driver_warning', 'driver_suspension', 'driver_ban', 'customer_warning', 'customer_suspension', 'customer_ban', 'insurance_claim_opened', 'legal_escalation'];
const RESOLVED = ['resolved_by_agreement', 'resolved_by_decision', 'withdrawn'];

interface Party { id: string; name: string; label: string }

export function DisputeActions({ disputeId, currentStatus, parties }: { disputeId: string; currentStatus: string; parties: Party[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState('no_action');
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState('');
  const [outNotes, setOutNotes] = useState('');

  async function call(payload: Record<string, unknown>, okMsg: string, tag: string) {
    setBusy(tag);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Action failed');
      toast.success(okMsg);
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy('');
    }
  }

  const refundKind = kind === 'full_refund' || kind === 'partial_refund' || kind === 're_invoice' || kind === 'credit_apology';
  const needsTarget = kind.startsWith('driver_') || kind.startsWith('customer_');

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <div className="mb-3 font-body text-[13px] font-semibold text-admin-text">Workflow status</div>
        <div className="flex flex-wrap items-end gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          {RESOLVED.includes(status) && (
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution summary" className="min-w-[220px] flex-1 rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" />
          )}
          <button onClick={() => call({ action: 'set_status', status, note: note || undefined }, 'Status updated', 'status')} disabled={busy !== '' || status === currentStatus} className="inline-flex items-center gap-1.5 rounded-xl bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white disabled:opacity-50">
            {busy === 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" strokeWidth={2} />} Update
          </button>
        </div>
      </div>

      {/* Internal note / message */}
      <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <div className="mb-3 font-body text-[13px] font-semibold text-admin-text">Add a case note</div>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} placeholder="Investigation note, contact log, next step…" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" />
        <div className="mt-3 flex justify-end">
          <button onClick={() => { if (!msg.trim()) return; call({ action: 'add_message', body: msg.trim() }, 'Note added', 'msg').then((ok) => ok && setMsg('')); }} disabled={busy !== '' || !msg.trim()} className="inline-flex items-center gap-1.5 rounded-xl border border-admin-border px-4 py-2 font-body text-sm font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">
            {busy === 'msg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />} Add note
          </button>
        </div>
      </div>

      {/* Outcome */}
      <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <div className="mb-3 font-body text-[13px] font-semibold text-admin-text">Record outcome &amp; resolve</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Outcome</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
              {OUTCOMES.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
            </select></label>
          {refundKind && (
            <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Amount ₦</span>
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
          )}
          {needsTarget && (
            <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Applies to</span>
              <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
                <option value="">Select party…</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.label}: {p.name}</option>)}
              </select></label>
          )}
          <label className="sm:col-span-2"><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Notes</span>
            <textarea value={outNotes} onChange={(e) => setOutNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
        </div>
        <p className="mt-2 font-body text-[12px] text-admin-text-muted">Recording an outcome resolves the case. Suspension/ban outcomes also suspend the selected party&apos;s account.</p>
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => {
              if (needsTarget && !target) return void toast.error('Choose which party this applies to.');
              call({ action: 'record_outcome', kind, amount: refundKind && amount ? Number(amount) : null, notes: outNotes || undefined, targetUserId: needsTarget ? target : null }, 'Outcome recorded — case resolved', 'outcome');
            }}
            disabled={busy !== ''}
            className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === 'outcome' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" strokeWidth={2} />} Record &amp; resolve
          </button>
        </div>
      </div>
    </div>
  );
}
