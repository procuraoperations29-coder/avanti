'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface DriverOption {
  id: string;
  label: string;
}

export function CorporateActions({
  requestId,
  status,
  drivers,
  defaultStartDate,
}: {
  requestId: string;
  status: string;
  drivers: DriverOption[];
  defaultStartDate: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [driverPay, setDriverPay] = useState('');
  const [otRate, setOtRate] = useState('');
  const [position, setPosition] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);

  async function act(payload: Record<string, unknown>, successMsg: string, reset?: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/corporate/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(successMsg);
      if (reset) {
        setDriverId('');
        setDailyRate('');
        setDriverPay('');
        setOtRate('');
        setPosition('');
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';
  const terminal = status === 'declined' || status === 'closed';

  return (
    <div className="space-y-4">
      {!terminal && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Driver">
              <select className={inputClass} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Select a driver…</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Position (optional)">
              <input className={inputClass} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Executive driver" />
            </Field>
            <Field label="Start date">
              <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Daily rate — org pays (₦)">
              <input type="number" min={0} className={`${inputClass} tabular-nums`} value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} placeholder="15000" />
            </Field>
            <Field label="Driver daily pay (₦)">
              <input type="number" min={0} className={`${inputClass} tabular-nums`} value={driverPay} onChange={(e) => setDriverPay(e.target.value)} placeholder="11000" />
            </Field>
            <Field label="Overtime / hour (₦, pass-through)">
              <input type="number" min={0} className={`${inputClass} tabular-nums`} value={otRate} onChange={(e) => setOtRate(e.target.value)} placeholder="2000" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={busy}
              onClick={() => {
                if (!driverId) return toast.error('Pick a driver.');
                const dr = Number(dailyRate);
                const dp = Number(driverPay);
                if (!dr || dr <= 0) return toast.error('Enter the daily rate.');
                if (dp > dr) return toast.error("Driver pay can't exceed the daily rate.");
                act(
                  {
                    action: 'assign',
                    driverId,
                    dailyRate: dr,
                    driverDailyPay: dp || 0,
                    overtimeHourlyRate: Number(otRate) || 0,
                    positionTitle: position.trim() || null,
                    startDate,
                  },
                  'Driver assigned',
                  true
                );
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <UserPlus className="h-4 w-4" strokeWidth={2} />}
              Assign driver
            </button>
            {status === 'new' && (
              <button disabled={busy} onClick={() => act({ action: 'review' }, 'Marked reviewing')} className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50">
                Mark reviewing
              </button>
            )}
            <button disabled={busy} onClick={() => act({ action: 'fulfill' }, 'Marked fulfilled')} className="font-body text-[12px] font-medium text-admin-green-text hover:text-admin-green disabled:opacity-50">
              Mark fulfilled
            </button>
            <button disabled={busy} onClick={() => act({ action: 'decline' }, 'Declined')} className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50">
              Decline
            </button>
          </div>
        </>
      )}
      {terminal && (
        <span className="inline-flex items-center rounded-full bg-admin-bg px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
          {status}
        </span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body text-[12px] font-medium text-admin-text">{label}</span>
      {children}
    </label>
  );
}
