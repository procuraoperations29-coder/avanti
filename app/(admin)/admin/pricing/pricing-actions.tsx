'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const IN = 'w-24 rounded-lg border border-admin-border bg-admin-bg px-2 py-1 font-body text-[13px] tabular-nums text-admin-text outline-none focus:border-admin-green';

export function RuleEditor({ rule }: {
  rule: {
    id: string; base_customer_price: number; base_driver_payout: number;
    overtime_multiplier: number | null; overtime_threshold_hours: number | null; minimum_charge: number | null;
  };
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cp, setCp] = useState(String(rule.base_customer_price));
  const [dp, setDp] = useState(String(rule.base_driver_payout));
  const [om, setOm] = useState(rule.overtime_multiplier != null ? String(rule.overtime_multiplier) : '');
  const [ot, setOt] = useState(rule.overtime_threshold_hours != null ? String(rule.overtime_threshold_hours) : '');
  const [mc, setMc] = useState(rule.minimum_charge != null ? String(rule.minimum_charge) : '');

  const fmt = (n: number | null) => (n == null ? '—' : `₦${Number(n).toLocaleString('en-NG')}`);

  async function save() {
    const cpN = Number(cp), dpN = Number(dp);
    if (!(cpN >= 0) || !(dpN >= 0)) return toast.error('Enter valid amounts.');
    if (dpN > cpN) return toast.error('Driver payout cannot exceed customer price.');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pricing/rules/${rule.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCustomerPrice: cpN, baseDriverPayout: dpN,
          overtimeMultiplier: om ? Number(om) : null,
          overtimeThresholdHours: ot ? Number(ot) : null,
          minimumCharge: mc ? Number(mc) : null,
        }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Save failed');
      toast.success('Rule updated');
      setEdit(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!edit) {
    return (
      <div className="flex items-center gap-4 font-body text-[13px] tabular-nums text-admin-text">
        <span>Price <b>{fmt(rule.base_customer_price)}</b></span>
        <span className="text-admin-text-muted">Payout {fmt(rule.base_driver_payout)}</span>
        <span className="text-admin-text-muted">Min {fmt(rule.minimum_charge)}</span>
        <span className="text-admin-text-muted">OT ×{rule.overtime_multiplier ?? '—'} @ {rule.overtime_threshold_hours ?? '—'}h</span>
        <button onClick={() => setEdit(true)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-admin-border px-2 py-1 text-[12px] font-medium text-admin-text hover:bg-admin-bg">
          <Pencil className="h-3 w-3" strokeWidth={2} /> Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-[11px] text-admin-text-muted">Customer ₦<br /><input value={cp} onChange={(e) => setCp(e.target.value)} className={IN} inputMode="decimal" /></label>
      <label className="text-[11px] text-admin-text-muted">Driver payout ₦<br /><input value={dp} onChange={(e) => setDp(e.target.value)} className={IN} inputMode="decimal" /></label>
      <label className="text-[11px] text-admin-text-muted">Min charge ₦<br /><input value={mc} onChange={(e) => setMc(e.target.value)} className={IN} inputMode="decimal" placeholder="—" /></label>
      <label className="text-[11px] text-admin-text-muted">OT ×<br /><input value={om} onChange={(e) => setOm(e.target.value)} className={IN} inputMode="decimal" placeholder="—" /></label>
      <label className="text-[11px] text-admin-text-muted">OT after (h)<br /><input value={ot} onChange={(e) => setOt(e.target.value)} className={IN} inputMode="decimal" placeholder="—" /></label>
      <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-admin-green px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />} Save
      </button>
      <button onClick={() => setEdit(false)} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-3 py-1.5 text-[12px] text-admin-text-muted hover:bg-admin-bg">
        <X className="h-3.5 w-3.5" /> Cancel
      </button>
    </div>
  );
}

export function CardStatusButton({ cardId, status }: { cardId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: 'publish' | 'retire') {
    if (!window.confirm(action === 'publish' ? 'Publish this rate card? It becomes the live pricing.' : 'Retire this rate card?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pricing/cards/${cardId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Action failed');
      toast.success(action === 'publish' ? 'Published' : 'Retired');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }
  if (status === 'draft') return <button onClick={() => act('publish')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-admin-green px-3 py-1.5 font-body text-[12px] font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Publish</button>;
  if (status === 'published') return <button onClick={() => act('retire')} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg disabled:opacity-50">{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Retire</button>;
  return null;
}
