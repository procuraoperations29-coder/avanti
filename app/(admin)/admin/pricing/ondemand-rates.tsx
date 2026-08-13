'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, Check, X, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface Rule {
  id: string;
  engagement_type: string;
  min_verification_tier: string;
  vehicle_class: string;
  time_band: string;
  day_type: string;
  base_customer_price: number;
  base_driver_payout: number;
  overtime_multiplier: number | null;
  overtime_threshold_hours: number | null;
  minimum_charge: number | null;
}

const TIERS = ['t1', 't2', 't3', 't4'];
const CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'];
const naira = (n: number | null) => (n == null ? '—' : `₦${Number(n).toLocaleString('en-NG')}`);
const commyOf = (price: number, payout: number) => (price > 0 ? Math.round((1 - payout / price) * 1000) / 10 : 0);
const IN = 'w-full rounded-lg border border-admin-border bg-admin-bg px-2 py-1 font-body text-[13px] tabular-nums text-admin-text outline-none focus:border-admin-green';
const LB = 'block text-[10px] uppercase tracking-wide text-admin-text-muted';

export function CardRules({ cardId, rules, commissionByTier }: { cardId: string; rules: Rule[]; commissionByTier: Record<string, number> }) {
  const [adding, setAdding] = useState(false);
  const byType: Record<string, Rule[]> = {};
  for (const r of rules) (byType[r.engagement_type] ??= []).push(r);

  return (
    <div className="px-5 py-3">
      {rules.length === 0 && !adding && <p className="py-4 text-center font-body text-sm text-admin-text-muted">No rates yet on this card.</p>}

      {Object.entries(byType).map(([type, rs]) => (
        <div key={type} className="mb-2">
          <div className="mb-1 font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">{type === 'full_day' ? 'Full day' : 'Hourly'}</div>
          <div className="overflow-hidden rounded-xl border border-admin-border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 bg-admin-bg px-3 py-1.5 font-body text-[10px] uppercase tracking-wide text-admin-text-muted">
              <span>Tier · class</span><span>Customer · commission · driver</span>
            </div>
            {rs.sort((a, b) => a.min_verification_tier.localeCompare(b.min_verification_tier) || a.vehicle_class.localeCompare(b.vehicle_class)).map((r) => (
              <RuleRow key={r.id} rule={r} />
            ))}
          </div>
        </div>
      ))}

      {adding ? (
        <AddRule cardId={cardId} commissionByTier={commissionByTier} onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 font-body text-[12px] font-medium text-admin-text hover:bg-admin-bg">
          <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add rate
        </button>
      )}
    </div>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(String(rule.base_customer_price));
  const [comm, setComm] = useState(String(commyOf(rule.base_customer_price, rule.base_driver_payout)));
  const [mc, setMc] = useState(rule.minimum_charge != null ? String(rule.minimum_charge) : '');
  const [om, setOm] = useState(rule.overtime_multiplier != null ? String(rule.overtime_multiplier) : '');
  const [ot, setOt] = useState(rule.overtime_threshold_hours != null ? String(rule.overtime_threshold_hours) : '');

  const priceN = Number(price) || 0;
  const commN = Number(comm) || 0;
  const payout = Math.round(priceN * (1 - commN / 100));

  async function save() {
    if (priceN < 0 || commN < 0 || commN > 100) return void toast.error('Enter a valid price and commission %');
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/pricing/rules/${rule.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseCustomerPrice: priceN, baseDriverPayout: payout, minimumCharge: mc ? Number(mc) : null, overtimeMultiplier: om ? Number(om) : null, overtimeThresholdHours: ot ? Number(ot) : null }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Save failed');
      toast.success('Rate updated'); setEdit(false); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); } finally { setBusy(false); }
  }

  if (!edit) {
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-t border-admin-border px-3 py-2">
        <span className="font-body text-[12px] text-admin-text"><b className="uppercase">{rule.vehicle_class}</b> · {String(rule.min_verification_tier).toUpperCase()}+</span>
        <div className="flex items-center gap-3 font-body text-[12px] tabular-nums">
          <span className="text-admin-text">{naira(rule.base_customer_price)}</span>
          <span className="text-admin-green-text">{commyOf(rule.base_customer_price, rule.base_driver_payout)}%</span>
          <span className="text-admin-text-muted">→ {naira(rule.base_driver_payout)}</span>
          <button onClick={() => setEdit(true)} className="rounded border border-admin-border p-1 text-admin-text hover:bg-admin-bg"><Pencil className="h-3 w-3" strokeWidth={2} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-admin-border px-3 py-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <label><span className={LB}>Customer ₦</span><input className={IN} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label><span className={LB}>Commission %</span><input className={IN} inputMode="decimal" value={comm} onChange={(e) => setComm(e.target.value)} /></label>
        <label><span className={LB}>Min ₦</span><input className={IN} inputMode="decimal" value={mc} onChange={(e) => setMc(e.target.value)} placeholder="—" /></label>
        <label><span className={LB}>OT ×</span><input className={IN} inputMode="decimal" value={om} onChange={(e) => setOm(e.target.value)} placeholder="—" /></label>
        <label><span className={LB}>OT after h</span><input className={IN} inputMode="decimal" value={ot} onChange={(e) => setOt(e.target.value)} placeholder="—" /></label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="font-body text-[11px] text-admin-text-muted">Driver gets <b className="tabular-nums text-admin-text">{naira(payout)}</b></span>
        <button onClick={save} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-admin-green px-3 py-1 text-[12px] font-semibold text-admin-navy-2 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.5} />} Save</button>
        <button onClick={() => setEdit(false)} className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-3 py-1 text-[12px] text-admin-text-muted hover:bg-admin-bg"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

function AddRule({ cardId, commissionByTier, onDone }: { cardId: string; commissionByTier: Record<string, number>; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [engagementType, setEngagementType] = useState('hourly');
  const [tier, setTier] = useState('t2');
  const [vehicleClass, setVehicleClass] = useState('sedan');
  const [price, setPrice] = useState('');
  const [comm, setComm] = useState(String(Math.round((commissionByTier['t2'] ?? 0.2) * 100)));
  const [mc, setMc] = useState('');

  function onTier(t: string) { setTier(t); setComm(String(Math.round((commissionByTier[t] ?? 0.2) * 100))); }

  const priceN = Number(price) || 0;
  const payout = Math.round(priceN * (1 - (Number(comm) || 0) / 100));

  async function add() {
    if (priceN <= 0) return void toast.error('Enter a customer price');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/pricing/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateCardId: cardId, engagementType, minVerificationTier: tier, vehicleClass,
          unit: engagementType === 'full_day' ? 'day' : 'hour',
          baseCustomerPrice: priceN, baseDriverPayout: payout, minimumCharge: mc ? Number(mc) : null,
        }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not add rate');
      toast.success('Rate added'); onDone(); router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Could not add rate'); } finally { setBusy(false); }
  }

  return (
    <div className="mt-2 rounded-xl border border-admin-green/40 bg-admin-green-soft/40 p-3">
      <div className="mb-2 font-body text-[12px] font-semibold text-admin-text">New rate</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label><span className={LB}>Type</span><select className={IN} value={engagementType} onChange={(e) => setEngagementType(e.target.value)}><option value="hourly">Hourly</option><option value="full_day">Full day</option></select></label>
        <label><span className={LB}>Tier</span><select className={IN} value={tier} onChange={(e) => onTier(e.target.value)}>{TIERS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></label>
        <label><span className={LB}>Class</span><select className={IN} value={vehicleClass} onChange={(e) => setVehicleClass(e.target.value)}>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label><span className={LB}>Customer ₦ / {engagementType === 'full_day' ? 'day' : 'hr'}</span><input className={IN} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label><span className={LB}>Commission %</span><input className={IN} inputMode="decimal" value={comm} onChange={(e) => setComm(e.target.value)} /></label>
        <label><span className={LB}>Min ₦ (optional)</span><input className={IN} inputMode="decimal" value={mc} onChange={(e) => setMc(e.target.value)} placeholder="—" /></label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <span className="font-body text-[11px] text-admin-text-muted">Driver gets <b className="tabular-nums text-admin-text">{naira(payout)}</b></span>
        <button onClick={add} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-admin-green px-3 py-1 text-[12px] font-semibold text-admin-navy-2 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" strokeWidth={2} />} Add</button>
        <button onClick={onDone} className="inline-flex items-center gap-1 rounded-lg border border-admin-border px-3 py-1 text-[12px] text-admin-text-muted hover:bg-admin-bg"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
