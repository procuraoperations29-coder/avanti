import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CarFront, MapPin, Phone } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/shell/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';

export const dynamic = 'force-dynamic';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}
function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Confirmed — upcoming',
  active: 'On hire',
  completed: 'Completed',
};

export default async function DriverCarHirePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  const { data: profile } = await A.from('driver_profiles').select('id').eq('user_id', user.id).single();
  if (!profile) redirect('/driver');

  const { data } = await A.from('car_hire_bookings')
    .select('id, vehicle_id, customer_user_id, start_date, end_date, days, hours_per_day, status, pickup_address, contact_phone, driver_pay_total, driver_settlement_status')
    .eq('assigned_driver_id', profile.id)
    .in('status', ['paid', 'active', 'completed'])
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  const list = (data ?? []) as Array<Record<string, unknown>>;
  const vehIds = Array.from(new Set(list.map((b) => b.vehicle_id).filter(Boolean))) as string[];
  const custIds = Array.from(new Set(list.map((b) => b.customer_user_id).filter(Boolean))) as string[];
  const [{ data: vehs }, { data: custs }] = await Promise.all([
    vehIds.length ? A.from('hire_vehicles').select('id, make, model, year').in('id', vehIds) : Promise.resolve({ data: [] }),
    custIds.length ? A.from('users').select('id, full_name').in('id', custIds) : Promise.resolve({ data: [] }),
  ]);
  const vehLabel: Record<string, string> = Object.fromEntries((vehs ?? []).map((v: { id: string; make: string; model: string; year: number | null }) => [v.id, `${v.make} ${v.model}${v.year ? ` · ${v.year}` : ''}`]));
  const custName: Record<string, string> = Object.fromEntries((custs ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Customer']));

  const upcomingEarnings = list
    .filter((b) => ['paid', 'active'].includes(String(b.status)))
    .reduce((sum, b) => sum + Number(b.driver_pay_total ?? 0), 0);

  return (
    <PageShell>
      <Link href="/driver" className="mb-4 inline-flex items-center gap-1.5 font-body text-[13px] text-ink-muted transition-colors hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Dashboard
      </Link>

      <div className="mb-8">
        <SectionLabel>Car hire</SectionLabel>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Your car-hire jobs</h1>
        <p className="mt-2 font-body text-sm text-ink-muted">
          Hires where you&apos;re the assigned driver. You drive a partner&apos;s car; your pay is shown per job.
          {upcomingEarnings > 0 && <> Upcoming: <b className="text-ink">{formatNaira(upcomingEarnings)}</b>.</>}
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState Icon={CarFront} title="No car-hire jobs yet" description="When ops assigns you to a car hire, it'll appear here with the pickup details." />
      ) : (
        <div className="space-y-3">
          {list.map((b) => {
            const pickup = (b.pickup_address as { line?: string } | null)?.line ?? null;
            return (
              <div key={String(b.id)} className="border border-line bg-paper-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-body text-sm font-semibold text-ink">{b.vehicle_id ? (vehLabel[String(b.vehicle_id)] ?? 'Vehicle') : 'Vehicle'}</div>
                    <div className="mt-0.5 font-body text-[12px] text-ink-muted">
                      {fmtDate(String(b.start_date))} → {fmtDate(String(b.end_date))} · {String(b.days)} day{Number(b.days) === 1 ? '' : 's'} × {String(b.hours_per_day)}h
                    </div>
                    <div className="mt-1 font-body text-[12px] text-ink">Customer: {custName[String(b.customer_user_id)] ?? 'Customer'}</div>
                    {pickup && <div className="mt-1 flex items-center gap-1.5 font-body text-[12px] text-ink-muted"><MapPin className="h-3.5 w-3.5" strokeWidth={2} /> {pickup}</div>}
                    {Boolean(b.contact_phone) && <div className="mt-1 flex items-center gap-1.5 font-body text-[12px] text-ink-muted"><Phone className="h-3.5 w-3.5" strokeWidth={2} /> {String(b.contact_phone)}</div>}
                  </div>
                  <span className="inline-flex shrink-0 items-center border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {STATUS_LABEL[String(b.status)] ?? String(b.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="font-body text-[12px] text-ink-muted">Your pay</span>
                  <span className="font-body text-sm font-semibold tabular-nums text-ink">
                    {formatNaira(Number(b.driver_pay_total ?? 0))}
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {b.driver_settlement_status === 'settled' ? 'paid out' : 'pending'}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
