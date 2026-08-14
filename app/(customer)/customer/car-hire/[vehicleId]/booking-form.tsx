'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, ArrowRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { formatNaira } from '@/lib/permanent/salary';
import { computeCarHireQuote, daysBetween } from '@/lib/carhire/quote';

export interface SafeVehicleDetail {
  id: string;
  make: string;
  model: string;
  year: number | null;
  daily_rate: number;
  driver_daily_rate: number;
  included_hours_per_day: number;
  overtime_hourly_rate: number | null;
  min_days: number;
}

const input =
  'w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
const label = 'mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted';

function todayISO(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function CarHireBookingForm({ vehicle, defaultPhone, vatRate }: { vehicle: SafeVehicleDetail; defaultPhone: string; vatRate: number }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(todayISO(1));
  const [endDate, setEndDate] = useState(todayISO(1));
  const [hoursPerDay, setHoursPerDay] = useState(String(vehicle.included_hours_per_day));
  const [pickup, setPickup] = useState('');
  const [passengers, setPassengers] = useState('');
  const [phone, setPhone] = useState(defaultPhone);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const days = useMemo(() => daysBetween(startDate, endDate), [startDate, endDate]);
  const hpd = Math.max(1, Number(hoursPerDay) || vehicle.included_hours_per_day);

  const quote = useMemo(
    () =>
      computeCarHireQuote(
        {
          daily_rate: vehicle.daily_rate,
          partner_daily_cost: 0,
          driver_daily_rate: vehicle.driver_daily_rate,
          driver_daily_pay: 0,
          included_hours_per_day: vehicle.included_hours_per_day,
          overtime_hourly_rate: vehicle.overtime_hourly_rate,
          min_days: vehicle.min_days,
        },
        { days, hoursPerDay: hpd },
        vatRate
      ),
    [vehicle, days, hpd, vatRate]
  );

  const belowMin = quote.days < vehicle.min_days;

  const submit = async () => {
    if (endDate < startDate) return void toast.error('End date must be on or after the start date');
    if (!pickup.trim()) return void toast.error('Where should the car be delivered?');
    if (!phone.trim()) return void toast.error('A contact phone number is required');
    setBusy(true);
    try {
      const res = await fetch('/api/customer/car-hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          startDate,
          endDate,
          hoursPerDay: hpd,
          pickupAddress: pickup.trim(),
          passengers: passengers ? Number(passengers) : null,
          contactPhone: phone.trim(),
          specialRequirements: notes.trim() || null,
        }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Could not send your request');
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send your request');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-admin-green/30 bg-admin-green-soft p-6 shadow-admin-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-admin-card text-admin-green-text shadow-admin-sm">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-tight text-admin-text">Request sent</h3>
        <p className="mt-2 font-body text-sm leading-relaxed text-admin-text">
          We&apos;ll confirm the car&apos;s availability, assign your driver, and send you a final quote to pay.
          The estimate you saw was <b>{formatNaira(quote.offerTotal)}</b> for {quote.days} day{quote.days === 1 ? '' : 's'}.
        </p>
        <button
          onClick={() => router.push('/customer/car-hire/bookings')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-admin-navy px-4 py-2 font-body text-sm font-medium text-white shadow-admin-sm hover:bg-admin-navy-2"
        >
          View my requests <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={label}>Start date</span><input type="date" min={todayISO(0)} className={input} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }} /></label>
        <label><span className={label}>End date</span><input type="date" min={startDate} className={input} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
        <label><span className={label}>Hours per day</span><input inputMode="numeric" className={input} value={hoursPerDay} onChange={(e) => setHoursPerDay(e.target.value)} /></label>
        <label><span className={label}>Passengers (optional)</span><input inputMode="numeric" className={input} value={passengers} onChange={(e) => setPassengers(e.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>Pickup / delivery address</span><input className={input} value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Where should we bring the car?" /></label>
        <label><span className={label}>Contact phone</span><input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
        <label className="sm:col-span-2"><span className={label}>Anything we should know? (optional)</span><textarea rows={2} className={input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Airport runs, specific routes, child seat…" /></label>
      </div>

      {/* Live indicative quote */}
      <div className="mt-6 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
        <div className="mb-3 font-body text-[11px] font-semibold uppercase tracking-wide text-admin-text-muted">Estimated price</div>
        <Row label={`Car · ${formatNaira(vehicle.daily_rate)} × ${quote.days} day${quote.days === 1 ? '' : 's'}`} value={formatNaira(vehicle.daily_rate * quote.days)} />
        {quote.overtimeTotal > 0 && <Row label={`Extra hours · ${quote.overtimeHours}h`} value={formatNaira(quote.overtimeTotal)} />}
        <Row label={`Driver · ${quote.days} day${quote.days === 1 ? '' : 's'}`} value={formatNaira(quote.driverSubtotal)} />
        <Row label="VAT (7.5%)" value={formatNaira(quote.vatAmount)} />
        <div className="mt-2 flex items-center justify-between border-t border-admin-border pt-3">
          <span className="font-body text-sm font-semibold text-admin-text">Estimated total</span>
          <span className="font-display text-xl font-semibold tabular-nums text-admin-text">{formatNaira(quote.offerTotal)}</span>
        </div>
        <p className="mt-2 font-body text-[11px] text-admin-text-muted">Indicative — we confirm availability and send a final quote before you pay.</p>
      </div>

      {belowMin && (
        <p className="mt-3 font-body text-[12px] text-admin-amber-text">This car has a minimum hire of {vehicle.min_days} days; we&apos;ve priced {quote.days}.</p>
      )}

      <button onClick={submit} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-admin-green px-5 py-3 font-body text-sm font-semibold text-admin-navy-2 shadow-admin-sm transition-colors hover:bg-admin-green/90 disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Request this car
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 font-body text-[13px]">
      <span className="text-admin-text-muted">{label}</span>
      <span className="tabular-nums text-admin-text">{value}</span>
    </div>
  );
}
