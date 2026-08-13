'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface PricingSettingsView {
  vatRate: number;
  ondemandCommissionByTier: Record<string, number>;
  tierMonthlySalary: Record<string, number>;
  placementCommissionRate: number;
  placementFeeRate: number;
  placementUpfrontRate: number;
  corporateUpfrontRate: number;
}

const TIERS = ['t1', 't2', 't3', 't4'] as const;
const box = 'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm tabular-nums text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const lab = 'mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted';
const pct = (frac: number) => String(Math.round(frac * 1000) / 10);
const toFrac = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n / 100 : 0;
};

export function SettingsEditor({ initial }: { initial: PricingSettingsView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [vat, setVat] = useState(pct(initial.vatRate));
  const [comm, setComm] = useState<Record<string, string>>(Object.fromEntries(TIERS.map((t) => [t, pct(initial.ondemandCommissionByTier[t] ?? 0.2)])));
  const [salary, setSalary] = useState<Record<string, string>>(Object.fromEntries(TIERS.map((t) => [t, String(initial.tierMonthlySalary[t] ?? 0)])));
  const [placeComm, setPlaceComm] = useState(pct(initial.placementCommissionRate));
  const [placeFee, setPlaceFee] = useState(pct(initial.placementFeeRate));
  const [placeUpfront, setPlaceUpfront] = useState(pct(initial.placementUpfrontRate));
  const [corpUpfront, setCorpUpfront] = useState(pct(initial.corporateUpfrontRate));

  async function save() {
    setBusy(true);
    try {
      const body = {
        vatRate: toFrac(vat),
        ondemandCommissionByTier: Object.fromEntries(TIERS.map((t) => [t, toFrac(comm[t] ?? '0')])),
        tierMonthlySalary: Object.fromEntries(TIERS.map((t) => [t, Math.max(0, Math.round(Number(salary[t]) || 0))])),
        placementCommissionRate: toFrac(placeComm),
        placementFeeRate: toFrac(placeFee),
        placementUpfrontRate: toFrac(placeUpfront),
        corporateUpfrontRate: toFrac(corpUpfront),
      };
      const res = await fetch('/api/admin/pricing/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Save failed');
      toast.success('Pricing settings saved');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
      {/* Tax */}
      <div className="grid gap-4 sm:grid-cols-4">
        <label>
          <span className={lab}>VAT %</span>
          <input className={box} inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} />
          <span className="mt-1 block font-body text-[11px] text-admin-text-muted">Added on top of every product.</span>
        </label>
      </div>

      {/* On-demand commission by tier */}
      <div className="mt-5">
        <div className="mb-2 font-body text-[12px] font-semibold text-admin-text">On-demand commission by tier</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map((t) => (
            <label key={t}>
              <span className={lab}>{t.toUpperCase()} commission %</span>
              <input className={box} inputMode="decimal" value={comm[t] ?? ''} onChange={(e) => setComm((s) => ({ ...s, [t]: e.target.value }))} />
            </label>
          ))}
        </div>
        <span className="mt-1 block font-body text-[11px] text-admin-text-muted">Default margin applied when you set an on-demand rate. Existing rates keep their values until you edit them.</span>
      </div>

      {/* Permanent salaries by tier */}
      <div className="mt-5">
        <div className="mb-2 font-body text-[12px] font-semibold text-admin-text">Permanent monthly salary by tier (₦)</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TIERS.map((t) => (
            <label key={t}>
              <span className={lab}>{t.toUpperCase()} / month</span>
              <input className={box} inputMode="numeric" value={salary[t] ?? ''} onChange={(e) => setSalary((s) => ({ ...s, [t]: e.target.value }))} />
            </label>
          ))}
        </div>
      </div>

      {/* Commission & fees */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label><span className={lab}>Placement commission %</span><input className={box} inputMode="decimal" value={placeComm} onChange={(e) => setPlaceComm(e.target.value)} /></label>
        <label><span className={lab}>Placement fee %</span><input className={box} inputMode="decimal" value={placeFee} onChange={(e) => setPlaceFee(e.target.value)} /></label>
        <label><span className={lab}>Placement upfront %</span><input className={box} inputMode="decimal" value={placeUpfront} onChange={(e) => setPlaceUpfront(e.target.value)} /></label>
        <label><span className={lab}>Corporate upfront %</span><input className={box} inputMode="decimal" value={corpUpfront} onChange={(e) => setCorpUpfront(e.target.value)} /></label>
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-5 py-2 font-body text-sm font-semibold text-admin-navy-2 shadow-admin-sm hover:bg-admin-green/90 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2.5} />} Save settings
        </button>
      </div>
    </div>
  );
}
