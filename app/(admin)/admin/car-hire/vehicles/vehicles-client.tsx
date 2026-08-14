'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Pencil, X, Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { formatNaira } from '@/lib/permanent/salary';
import { computeCarHireQuote } from '@/lib/carhire/quote';

export interface VehicleRow {
  id: string;
  partner_id: string;
  make: string;
  model: string;
  year: number | null;
  colour: string | null;
  plate_number: string | null;
  vehicle_class: string;
  transmission: string | null;
  seats: number | null;
  features: string[] | null;
  city: string | null;
  photo_path: string | null;
  partner_daily_cost: number;
  daily_rate: number;
  included_hours_per_day: number;
  overtime_hourly_rate: number | null;
  min_days: number;
  driver_daily_rate: number;
  driver_daily_pay: number;
  status: string;
}
export interface PartnerOption { id: string; name: string }

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
function photoUrl(path: string | null): string | null {
  return path ? `${SUPA}/storage/v1/object/public/car-hire-vehicles/${path}` : null;
}

const CLASSES = ['sedan', 'suv', 'executive', 'van', 'pickup'];
const input =
  'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const label = 'mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted';

export function VehiclesClient({ initial, partners, partnerNames, vatRate }: { initial: VehicleRow[]; partners: PartnerOption[]; partnerNames: Record<string, string>; vatRate: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Partial<VehicleRow> | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-body text-[12px] text-admin-text-muted">
          Two prices per car: what the customer pays (<b>daily rate</b>) and what Avanti pays the partner (<b>cost</b>). The gap is your margin.
        </p>
        <button
          onClick={() => partners.length ? setEditing({ vehicle_class: 'sedan', included_hours_per_day: 10, min_days: 1, status: 'available' }) : toast.error('Add an active leasing partner first')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> Add vehicle
        </button>
      </div>

      {editing && (
        <VehicleForm
          initial={editing}
          partners={partners}
          vatRate={vatRate}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh(); }}
        />
      )}

      {initial.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No hire vehicles yet. Add cars from your leasing partners with their daily pricing.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {initial.map((v) => {
            const url = photoUrl(v.photo_path);
            const allIn = computeCarHireQuote(
              { daily_rate: Number(v.daily_rate), partner_daily_cost: Number(v.partner_daily_cost), driver_daily_rate: Number(v.driver_daily_rate), driver_daily_pay: Number(v.driver_daily_pay), included_hours_per_day: Number(v.included_hours_per_day), overtime_hourly_rate: v.overtime_hourly_rate != null ? Number(v.overtime_hourly_rate) : null, min_days: Number(v.min_days) },
              { days: 1, hoursPerDay: Number(v.included_hours_per_day) },
              vatRate
            );
            return (
              <div key={v.id} className="flex gap-4 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-admin-bg">
                  {url ? <img src={url} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-body text-[10px] text-admin-text-muted">No photo</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-body text-sm font-semibold text-admin-text">
                        {v.make} {v.model} {v.year ? `· ${v.year}` : ''}
                      </div>
                      <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                        {[v.vehicle_class, v.transmission, v.seats ? `${v.seats} seats` : null, partnerNames[v.partner_id]].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button onClick={() => setEditing(v)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-admin-border px-2 py-1 font-body text-[12px] text-admin-text hover:bg-admin-bg">
                      <Pencil className="h-3.5 w-3.5" strokeWidth={2} /> Edit
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-[12px]">
                    <span className="text-admin-text"><b className="tabular-nums">{formatNaira(allIn.offerTotal)}</b> <span className="text-admin-text-muted">/day all-in</span></span>
                    <span className="text-admin-text-muted">margin <span className="tabular-nums text-admin-green-text">{formatNaira(allIn.marginTotal)}</span>/day</span>
                    <VehicleStatusPill status={v.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VehicleStatusPill({ status }: { status: string }) {
  const cls =
    status === 'available' ? 'bg-admin-green-soft text-admin-green-text'
      : status === 'maintenance' ? 'bg-admin-amber-soft text-admin-amber-text'
        : 'bg-admin-bg text-admin-text-muted';
  return <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + cls}>{status}</span>;
}

function num(v: unknown): number { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function VehicleForm({ initial, partners, vatRate, onClose, onSaved }: { initial: Partial<VehicleRow>; partners: PartnerOption[]; vatRate: number; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(initial.id);
  const [f, setF] = useState<Record<string, string>>({
    partner_id: initial.partner_id ?? partners[0]?.id ?? '',
    make: initial.make ?? '',
    model: initial.model ?? '',
    year: initial.year != null ? String(initial.year) : '',
    colour: initial.colour ?? '',
    plate_number: initial.plate_number ?? '',
    vehicle_class: initial.vehicle_class ?? 'sedan',
    transmission: initial.transmission ?? 'automatic',
    seats: initial.seats != null ? String(initial.seats) : '',
    city: initial.city ?? '',
    features: (initial.features ?? []).join(', '),
    partner_daily_cost: initial.partner_daily_cost != null ? String(initial.partner_daily_cost) : '',
    daily_rate: initial.daily_rate != null ? String(initial.daily_rate) : '',
    included_hours_per_day: initial.included_hours_per_day != null ? String(initial.included_hours_per_day) : '10',
    overtime_hourly_rate: initial.overtime_hourly_rate != null ? String(initial.overtime_hourly_rate) : '',
    min_days: initial.min_days != null ? String(initial.min_days) : '1',
    driver_daily_rate: initial.driver_daily_rate != null ? String(initial.driver_daily_rate) : '',
    driver_daily_pay: initial.driver_daily_pay != null ? String(initial.driver_daily_pay) : '',
    status: initial.status ?? 'available',
  });
  const [photoPath, setPhotoPath] = useState<string | null>(initial.photo_path ?? null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const preview = useMemo(() => computeCarHireQuote(
    { daily_rate: num(f.daily_rate), partner_daily_cost: num(f.partner_daily_cost), driver_daily_rate: num(f.driver_daily_rate), driver_daily_pay: num(f.driver_daily_pay), included_hours_per_day: num(f.included_hours_per_day) || 10, overtime_hourly_rate: f.overtime_hourly_rate ? num(f.overtime_hourly_rate) : null, min_days: num(f.min_days) || 1 },
    { days: 1, hoursPerDay: num(f.included_hours_per_day) || 10 },
    vatRate
  ), [f, vatRate]);

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/car-hire/vehicles/photo', { method: 'POST', body: fd });
      const b = (await res.json()) as { path?: string; error?: string; message?: string };
      if (!res.ok || !b.path) return void toast.error(b.message ?? b.error ?? 'Photo upload failed');
      setPhotoPath(b.path);
      toast.success('Photo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!f.partner_id) return void toast.error('Choose a partner');
    if (!f.make || !f.model) return void toast.error('Make and model are required');
    if (num(f.daily_rate) < num(f.partner_daily_cost)) return void toast.error('Daily rate must be ≥ partner cost');
    if (num(f.driver_daily_rate) < num(f.driver_daily_pay)) return void toast.error('Driver rate must be ≥ driver pay');
    setBusy(true);
    try {
      const payload = {
        partner_id: f.partner_id,
        make: f.make.trim(),
        model: f.model.trim(),
        year: f.year ? num(f.year) : null,
        colour: f.colour || null,
        plate_number: f.plate_number || null,
        vehicle_class: f.vehicle_class,
        transmission: f.transmission || null,
        seats: f.seats ? num(f.seats) : null,
        features: f.features ? f.features.split(',').map((s) => s.trim()).filter(Boolean) : [],
        city: f.city || null,
        photo_path: photoPath,
        partner_daily_cost: num(f.partner_daily_cost),
        daily_rate: num(f.daily_rate),
        included_hours_per_day: num(f.included_hours_per_day) || 10,
        overtime_hourly_rate: f.overtime_hourly_rate ? num(f.overtime_hourly_rate) : null,
        min_days: num(f.min_days) || 1,
        driver_daily_rate: num(f.driver_daily_rate),
        driver_daily_pay: num(f.driver_daily_pay),
        status: f.status,
      };
      const res = await fetch(isEdit ? `/api/admin/car-hire/vehicles/${initial.id}` : '/api/admin/car-hire/vehicles', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Save failed');
      toast.success(isEdit ? 'Vehicle updated' : 'Vehicle added');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const url = photoUrl(photoPath);

  return (
    <div className="mb-5 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-body text-sm font-semibold text-admin-text">{isEdit ? 'Edit vehicle' : 'New hire vehicle'}</h3>
        <button onClick={onClose} className="text-admin-text-muted hover:text-admin-text"><X className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="sm:col-span-1"><span className={label}>Partner *</span>
          <select className={input} value={f.partner_id} onChange={(e) => set('partner_id', e.target.value)}>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label><span className={label}>Make *</span><input className={input} value={f.make} onChange={(e) => set('make', e.target.value)} /></label>
        <label><span className={label}>Model *</span><input className={input} value={f.model} onChange={(e) => set('model', e.target.value)} /></label>
        <label><span className={label}>Year</span><input className={input} inputMode="numeric" value={f.year} onChange={(e) => set('year', e.target.value)} /></label>
        <label><span className={label}>Colour</span><input className={input} value={f.colour} onChange={(e) => set('colour', e.target.value)} /></label>
        <label><span className={label}>Plate number</span><input className={input} value={f.plate_number} onChange={(e) => set('plate_number', e.target.value)} /></label>
        <label><span className={label}>Class</span>
          <select className={input} value={f.vehicle_class} onChange={(e) => set('vehicle_class', e.target.value)}>{CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label><span className={label}>Transmission</span>
          <select className={input} value={f.transmission} onChange={(e) => set('transmission', e.target.value)}><option value="automatic">automatic</option><option value="manual">manual</option></select>
        </label>
        <label><span className={label}>Seats</span><input className={input} inputMode="numeric" value={f.seats} onChange={(e) => set('seats', e.target.value)} /></label>
        <label><span className={label}>City</span><input className={input} value={f.city} onChange={(e) => set('city', e.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>Features (comma-separated)</span><input className={input} value={f.features} onChange={(e) => set('features', e.target.value)} placeholder="AC, leather seats, WiFi" /></label>
      </div>

      {/* Pricing */}
      <div className="mt-4 rounded-xl border border-admin-border bg-admin-bg/50 p-4">
        <div className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">Pricing (NGN per day)</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className={label}>Customer daily rate (car) *</span><input className={input} inputMode="numeric" value={f.daily_rate} onChange={(e) => set('daily_rate', e.target.value)} /></label>
          <label><span className={label}>Partner cost / day *</span><input className={input} inputMode="numeric" value={f.partner_daily_cost} onChange={(e) => set('partner_daily_cost', e.target.value)} /></label>
          <label><span className={label}>Min days</span><input className={input} inputMode="numeric" value={f.min_days} onChange={(e) => set('min_days', e.target.value)} /></label>
          <label><span className={label}>Driver daily rate (customer)</span><input className={input} inputMode="numeric" value={f.driver_daily_rate} onChange={(e) => set('driver_daily_rate', e.target.value)} /></label>
          <label><span className={label}>Driver daily pay (Avanti→driver)</span><input className={input} inputMode="numeric" value={f.driver_daily_pay} onChange={(e) => set('driver_daily_pay', e.target.value)} /></label>
          <label><span className={label}>Included hours / day</span><input className={input} inputMode="numeric" value={f.included_hours_per_day} onChange={(e) => set('included_hours_per_day', e.target.value)} /></label>
          <label><span className={label}>Overtime / hour</span><input className={input} inputMode="numeric" value={f.overtime_hourly_rate} onChange={(e) => set('overtime_hourly_rate', e.target.value)} /></label>
          {isEdit && (
            <label><span className={label}>Status</span>
              <select className={input} value={f.status} onChange={(e) => set('status', e.target.value)}>
                <option value="available">available</option><option value="unavailable">unavailable</option><option value="maintenance">maintenance</option><option value="retired">retired</option>
              </select>
            </label>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-body text-[12px]">
          <span className="text-admin-text-muted">Customer pays / day (incl. VAT): <b className="tabular-nums text-admin-text">{formatNaira(preview.offerTotal)}</b></span>
          <span className="text-admin-text-muted">Avanti margin / day: <b className="tabular-nums text-admin-green-text">{formatNaira(preview.marginTotal)}</b></span>
        </div>
      </div>

      {/* Photo */}
      <div className="mt-4 flex items-center gap-4">
        <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-admin-bg">
          {url ? <img src={url} alt="vehicle" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-body text-[10px] text-admin-text-muted">No photo</div>}
        </div>
        <div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-bg px-3 py-1.5 font-body text-[13px] font-medium text-admin-text hover:bg-admin-card disabled:opacity-50">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" strokeWidth={2} />} {photoPath ? 'Replace photo' : 'Upload photo'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file); if (fileRef.current) fileRef.current.value = ''; }} />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 font-body text-sm text-admin-text-muted hover:text-admin-text">Cancel</button>
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-admin-navy-2 shadow-admin-sm hover:bg-admin-green/90 disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save vehicle
        </button>
      </div>
    </div>
  );
}
