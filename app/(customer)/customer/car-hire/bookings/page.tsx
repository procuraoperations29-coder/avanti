import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CarFront } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { EmptyState } from '@/components/avanti/empty-state';
import { formatNaira } from '@/lib/permanent/salary';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  new: { text: 'Submitted', cls: 'bg-admin-amber-soft text-admin-amber-text' },
  reviewing: { text: 'Checking availability', cls: 'bg-admin-amber-soft text-admin-amber-text' },
  quoted: { text: 'Quote ready — pay to confirm', cls: 'bg-admin-green-soft text-admin-green-text' },
  paid: { text: 'Confirmed', cls: 'bg-admin-green-soft text-admin-green-text' },
  active: { text: 'On hire', cls: 'bg-admin-green-soft text-admin-green-text' },
  completed: { text: 'Completed', cls: 'bg-admin-bg text-admin-text-muted' },
  declined: { text: 'Not available', cls: 'bg-red-500/12 text-red-600' },
  cancelled: { text: 'Cancelled', cls: 'bg-red-500/12 text-red-600' },
};

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

export default async function MyCarHirePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in?next=/customer/car-hire/bookings');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const { data } = await A.from('car_hire_bookings')
    .select('id, vehicle_id, start_date, end_date, days, hours_per_day, status, offer_total, indicative_total, payment_link, payment_status')
    .eq('customer_user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const list = (data ?? []) as Array<Record<string, unknown>>;
  const vehIds = Array.from(new Set(list.map((b) => b.vehicle_id).filter(Boolean))) as string[];
  const { data: vehs } = vehIds.length ? await A.from('hire_vehicles').select('id, make, model, year').in('id', vehIds) : { data: [] };
  const vehLabel: Record<string, string> = Object.fromEntries((vehs ?? []).map((v: { id: string; make: string; model: string; year: number | null }) => [v.id, `${v.make} ${v.model}${v.year ? ` · ${v.year}` : ''}`]));

  return (
    <div className="mx-auto max-w-3xl px-6 pt-8 pb-20">
      <Link href="/customer/car-hire" className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Car hire
      </Link>

      <div className="mb-8">
        <AdminSectionLabel>Car hire</AdminSectionLabel>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-admin-text">Your requests</h1>
      </div>

      {list.length === 0 ? (
        <EmptyState
          Icon={CarFront}
          title="No car-hire requests yet"
          description="Browse our cars and request one — we'll confirm and send your quote."
        />
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const status = String(b.status);
            const s = STATUS_LABEL[status] ?? { text: status, cls: 'bg-admin-bg text-admin-text-muted' };
            const price = b.offer_total ? Number(b.offer_total) : b.indicative_total ? Number(b.indicative_total) : null;
            const showPay = status === 'quoted' && Boolean(b.payment_link) && b.payment_status !== 'paid';
            return (
              <div key={String(b.id)} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-body text-sm font-semibold text-admin-text">{b.vehicle_id ? (vehLabel[String(b.vehicle_id)] ?? 'Vehicle') : 'Vehicle'}</div>
                    <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                      {fmtDate(String(b.start_date))} → {fmtDate(String(b.end_date))} · {String(b.days)} day{Number(b.days) === 1 ? '' : 's'} × {String(b.hours_per_day)}h
                    </div>
                  </div>
                  <span className={'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-body text-[11px] font-medium ' + s.cls}>{s.text}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-body text-[13px] text-admin-text-muted">
                    {b.offer_total ? 'Quoted total' : 'Estimated'}{' '}
                    <span className="font-display text-base font-semibold tabular-nums text-admin-text">{price != null ? formatNaira(price) : '—'}</span>
                  </div>
                  {showPay && (
                    <a href={String(b.payment_link)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-semibold text-admin-navy-2 shadow-admin-sm hover:bg-admin-green/90">
                      Pay now
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
