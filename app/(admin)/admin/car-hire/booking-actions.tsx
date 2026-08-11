'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface DriverOption { id: string; name: string }

type Action = 'review' | 'quote' | 'mark_paid' | 'decline' | 'activate' | 'complete';

export function CarHireBookingActions({
  bookingId,
  status,
  hasVehicle,
  assignedDriverId,
  paymentLink,
  drivers,
}: {
  bookingId: string;
  status: string;
  hasVehicle: boolean;
  assignedDriverId: string | null;
  paymentLink: string | null;
  drivers: DriverOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [driverId, setDriverId] = useState<string>(assignedDriverId ?? '');

  async function run(action: Action, extra?: Record<string, unknown>) {
    setBusy(action);
    try {
      const res = await fetch(`/api/admin/car-hire/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const b = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok) return void toast.error(b.message ?? b.error ?? 'Action failed');
      toast.success(
        action === 'quote' ? 'Quote sent — invoice raised'
          : action === 'mark_paid' ? 'Marked paid'
            : action === 'decline' ? 'Declined'
              : 'Updated'
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-body text-[12px] font-medium disabled:opacity-50';
  const spin = (a: Action) => busy === a && <Loader2 className="h-3.5 w-3.5 animate-spin" />;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {(status === 'new' || status === 'reviewing') && (
        <>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="rounded-lg border border-admin-border bg-admin-bg px-2 py-1 font-body text-[12px] text-admin-text outline-none focus:border-admin-green"
          >
            <option value="">Assign driver…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button
            onClick={() => hasVehicle ? run('quote', { assignedDriverId: driverId || null }) : toast.error('Booking has no vehicle')}
            disabled={busy !== null}
            className={btn + ' bg-admin-green text-admin-navy-2 hover:bg-admin-green/90'}
            title="Compute the price from the vehicle, raise the Paystack invoice, notify the customer"
          >
            {spin('quote')} Send quote
          </button>
          <button onClick={() => run('decline')} disabled={busy !== null} className={btn + ' border border-admin-border text-red-600 hover:bg-admin-bg'}>
            {spin('decline')} Decline
          </button>
        </>
      )}

      {status === 'quoted' && (
        <>
          {paymentLink && (
            <a href={paymentLink} target="_blank" rel="noreferrer" className={btn + ' border border-admin-border text-admin-text hover:bg-admin-bg'}>
              <ExternalLink className="h-3.5 w-3.5" /> Pay link
            </a>
          )}
          <button onClick={() => run('mark_paid')} disabled={busy !== null} className={btn + ' bg-admin-navy text-white hover:bg-admin-navy-2'}>
            {spin('mark_paid')} Mark paid
          </button>
        </>
      )}

      {status === 'paid' && (
        <button onClick={() => run('activate')} disabled={busy !== null} className={btn + ' bg-admin-navy text-white hover:bg-admin-navy-2'}>
          {spin('activate')} Mark active
        </button>
      )}
      {status === 'active' && (
        <button onClick={() => run('complete')} disabled={busy !== null} className={btn + ' bg-admin-navy text-white hover:bg-admin-navy-2'}>
          {spin('complete')} Mark completed
        </button>
      )}
    </div>
  );
}
