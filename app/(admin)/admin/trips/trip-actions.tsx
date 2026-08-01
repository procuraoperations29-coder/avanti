'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

export interface DriverOption {
  id: string;
  label: string;
}

export function TripActions({
  tripId,
  status,
  paymentStatus,
  drivers,
  customerHasEmail,
  payLink,
}: {
  tripId: string;
  status: string;
  paymentStatus: string;
  drivers: DriverOption[];
  customerHasEmail: boolean;
  payLink: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [price, setPrice] = useState('');
  const [conditions, setConditions] = useState('');

  async function act(payload: Record<string, unknown>, successMsg: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string; emailMock?: boolean };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Action failed');
        return;
      }
      toast.success(body.emailMock ? `${successMsg} (email mocked in dev)` : successMsg);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  const terminal = status === 'paid' || status === 'declined' || status === 'closed';
  const quoted = status === 'quoted';

  const inputClass =
    'w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20';

  if (terminal) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={status} paymentStatus={paymentStatus} />
        {status !== 'paid' && (
          <button
            disabled={busy}
            onClick={() => act({ action: 'close' }, 'Closed')}
            className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quoted ? (
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={status} paymentStatus={paymentStatus} />
          {payLink && (
            <a
              href={payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-body text-[12px] font-medium text-admin-green-text hover:text-admin-green"
            >
              Payment link <ExternalLink className="h-3 w-3" strokeWidth={2} />
            </a>
          )}
          <button
            disabled={busy}
            onClick={() => act({ action: 'mark_paid' }, 'Marked paid')}
            className="rounded-xl border border-admin-green bg-admin-green-soft px-3 py-1.5 font-body text-[12px] font-medium text-admin-green-text shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-50"
          >
            Mark paid (transfer)
          </button>
          <button
            disabled={busy}
            onClick={() => act({ action: 'decline' }, 'Declined')}
            className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      ) : (
        <>
          {/* Quote form */}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-body text-[12px] font-medium text-admin-text">
                Match a driver <span className="font-normal text-admin-text-muted">(optional)</span>
              </span>
              <select className={inputClass} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">Not assigned yet</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block font-body text-[12px] font-medium text-admin-text">
                Price (customer total, ₦)
              </span>
              <input
                type="number"
                min={1}
                className={`${inputClass} tabular-nums`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="185000"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block font-body text-[12px] font-medium text-admin-text">
              Conditions <span className="font-normal text-admin-text-muted">(shown to the customer)</span>
            </span>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Price covers driver fees, accommodation and meals for 2 nights. Fuel and tolls are yours. 50% due to confirm, balance on departure."
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={busy || !customerHasEmail}
              onClick={() => {
                const p = Number(price);
                if (!p || p <= 0) return toast.error('Enter a price.');
                act(
                  { action: 'quote', driverId: driverId || null, price: p, conditions: conditions.trim() || null },
                  'Invoice sent'
                );
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Send className="h-4 w-4" strokeWidth={2} />}
              Create invoice &amp; send
            </button>
            {status === 'new' && (
              <button
                disabled={busy}
                onClick={() => act({ action: 'review' }, 'Marked reviewing')}
                className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50"
              >
                Mark reviewing
              </button>
            )}
            <button
              disabled={busy}
              onClick={() => act({ action: 'decline' }, 'Declined')}
              className="font-body text-[12px] font-medium text-admin-text-muted hover:text-admin-text disabled:opacity-50"
            >
              Decline
            </button>
          </div>
          {!customerHasEmail && (
            <p className="font-body text-[12px] text-admin-amber-text">
              This customer has no email on file — an invoice can&apos;t be sent until they add one.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatusPill({ status, paymentStatus }: { status: string; paymentStatus: string }) {
  const label = status === 'paid' ? (paymentStatus === 'manual_paid' ? 'Paid · transfer' : 'Paid') : status;
  const cls =
    status === 'paid'
      ? 'bg-admin-green-soft text-admin-green-text'
      : status === 'quoted'
        ? 'bg-admin-amber-soft text-admin-amber-text'
        : status === 'declined'
          ? 'bg-red-500/12 text-red-600'
          : 'bg-admin-bg text-admin-text-muted';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
