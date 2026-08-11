'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Pencil, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface PartnerRow {
  id: string;
  name: string;
  legal_name: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number_last4: string | null;
  account_holder_name: string | null;
}

const EMPTY: Partial<PartnerRow> = { status: 'active' };
const input =
  'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const label = 'mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted';

export function PartnersClient({ initial }: { initial: PartnerRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<PartnerRow> | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setEditing(EMPTY)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Add partner
        </button>
      </div>

      {editing && <PartnerForm initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />}

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No leasing partners yet. Add the companies that supply your hire vehicles.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {initial.map((p) => (
            <div key={p.id} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body text-sm font-semibold text-admin-text">{p.name}</span>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                    {[p.city, p.contact_name, p.contact_phone].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {p.contact_email && <div className="font-body text-[12px] text-admin-text-muted">{p.contact_email}</div>}
                  {p.account_number_last4 && (
                    <div className="mt-1 font-mono text-[11px] text-admin-text-muted">
                      {[p.bank_name, `•••• ${p.account_number_last4}`].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setEditing(p)}
                  className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-2 py-1 font-body text-[12px] text-admin-text hover:bg-admin-bg"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-admin-green-soft text-admin-green-text'
      : status === 'suspended'
        ? 'bg-admin-amber-soft text-admin-amber-text'
        : 'bg-admin-bg text-admin-text-muted';
  return <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + cls}>{status}</span>;
}

function PartnerForm({ initial, onClose, onSaved }: { initial: Partial<PartnerRow>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<PartnerRow>>(initial);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial.id);

  const set = (k: keyof PartnerRow, v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.name || f.name.trim().length < 2) return void toast.error('Name is required');
    setBusy(true);
    try {
      const payload = {
        name: f.name?.trim(),
        legal_name: f.legal_name || null,
        contact_name: f.contact_name || null,
        contact_phone: f.contact_phone || null,
        contact_email: f.contact_email || null,
        city: f.city || null,
        bank_name: f.bank_name || null,
        bank_code: f.bank_code || null,
        account_number_last4: f.account_number_last4 || null,
        account_holder_name: f.account_holder_name || null,
        notes: f.notes || null,
        ...(isEdit ? { status: f.status } : {}),
      };
      const res = await fetch(isEdit ? `/api/admin/car-hire/partners/${initial.id}` : '/api/admin/car-hire/partners', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Save failed');
      toast.success(isEdit ? 'Partner updated' : 'Partner added');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-body text-sm font-semibold text-admin-text">{isEdit ? 'Edit partner' : 'New leasing partner'}</h3>
        <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label><span className={label}>Company name *</span><input className={input} value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} /></label>
        <label><span className={label}>Legal name</span><input className={input} value={f.legal_name ?? ''} onChange={(e) => set('legal_name', e.target.value)} /></label>
        <label><span className={label}>Contact name</span><input className={input} value={f.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></label>
        <label><span className={label}>Contact phone</span><input className={input} value={f.contact_phone ?? ''} onChange={(e) => set('contact_phone', e.target.value)} /></label>
        <label><span className={label}>Contact email</span><input className={input} value={f.contact_email ?? ''} onChange={(e) => set('contact_email', e.target.value)} /></label>
        <label><span className={label}>City</span><input className={input} value={f.city ?? ''} onChange={(e) => set('city', e.target.value)} /></label>
        <label><span className={label}>Bank name</span><input className={input} value={f.bank_name ?? ''} onChange={(e) => set('bank_name', e.target.value)} /></label>
        <label><span className={label}>Account holder</span><input className={input} value={f.account_holder_name ?? ''} onChange={(e) => set('account_holder_name', e.target.value)} /></label>
        <label><span className={label}>Bank code</span><input className={input} value={f.bank_code ?? ''} onChange={(e) => set('bank_code', e.target.value)} /></label>
        <label><span className={label}>Account no. last 4</span><input className={input} maxLength={4} value={f.account_number_last4 ?? ''} onChange={(e) => set('account_number_last4', e.target.value)} /></label>
        {isEdit && (
          <label><span className={label}>Status</span>
            <select className={input} value={f.status ?? 'active'} onChange={(e) => set('status', e.target.value)}>
              <option value="active">active</option><option value="suspended">suspended</option><option value="closed">closed</option>
            </select>
          </label>
        )}
        <label className="sm:col-span-2"><span className={label}>Notes</span><textarea className={input} rows={2} value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 font-body text-sm text-admin-text-muted hover:text-admin-text">Cancel</button>
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-admin-navy-2 shadow-admin-sm hover:bg-admin-green/90 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
}
