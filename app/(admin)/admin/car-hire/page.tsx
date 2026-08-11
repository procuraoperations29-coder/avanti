import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, CarFront } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { formatNaira } from '@/lib/permanent/salary';
import { CarHireBookingActions, type DriverOption } from './booking-actions';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  new: 'bg-admin-amber-soft text-admin-amber-text',
  reviewing: 'bg-admin-amber-soft text-admin-amber-text',
  quoted: 'bg-admin-bg text-admin-text-muted',
  paid: 'bg-admin-green-soft text-admin-green-text',
  active: 'bg-admin-green-soft text-admin-green-text',
  completed: 'bg-admin-bg text-admin-text-muted',
  declined: 'bg-red-500/12 text-red-600',
  cancelled: 'bg-red-500/12 text-red-600',
};

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
}

export default async function CarHireHubPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView =
    user.roles.includes('admin_finance') || user.roles.includes('admin_support') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  const [{ count: partnerCount }, { count: vehicleCount }, { data: bookings }] = await Promise.all([
    A.from('leasing_partners').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    A.from('hire_vehicles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_active', true),
    A.from('car_hire_bookings')
      .select('id, customer_user_id, vehicle_id, start_date, end_date, days, hours_per_day, status, offer_total, indicative_total, assigned_driver_id, payment_link, payment_status')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const list = (bookings ?? []) as Array<Record<string, unknown>>;
  const openCount = list.filter((b) => ['new', 'reviewing'].includes(String(b.status))).length;

  // Resolve customer names + vehicle labels for the queue.
  const custIds = Array.from(new Set(list.map((b) => b.customer_user_id).filter(Boolean))) as string[];
  const vehIds = Array.from(new Set(list.map((b) => b.vehicle_id).filter(Boolean))) as string[];
  const [{ data: custs }, { data: vehs }] = await Promise.all([
    custIds.length ? A.from('users').select('id, full_name').in('id', custIds) : Promise.resolve({ data: [] }),
    vehIds.length ? A.from('hire_vehicles').select('id, make, model').in('id', vehIds) : Promise.resolve({ data: [] }),
  ]);
  const custName: Record<string, string> = Object.fromEntries((custs ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? '—']));
  const vehLabel: Record<string, string> = Object.fromEntries((vehs ?? []).map((v: { id: string; make: string; model: string }) => [v.id, `${v.make} ${v.model}`]));

  // Drivers for assignment.
  const { data: driverRows } = await A.from('driver_profiles')
    .select('id, user_id, verification_status, suspended')
    .eq('verification_status', 'approved')
    .eq('suspended', false)
    .is('deleted_at', null)
    .limit(200);
  const dIds = (driverRows ?? []).map((d: { user_id: string }) => d.user_id);
  const { data: dUsers } = dIds.length ? await A.from('users').select('id, full_name').in('id', dIds) : { data: [] };
  const dName: Record<string, string> = Object.fromEntries((dUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
  const drivers: DriverOption[] = (driverRows ?? []).map((d: { id: string; user_id: string }) => ({ id: d.id, name: dName[d.user_id] ?? 'Driver' }));

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Car hire" subtitle="Car + driver hire from leasing partners — inventory, pricing, and bookings" />

      {/* Sub-nav */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Link href="/admin/car-hire/partners" className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-colors hover:border-admin-green/40">
          <Building2 className="h-5 w-5 text-admin-green-text" strokeWidth={1.75} />
          <div>
            <div className="font-body text-sm font-semibold text-admin-text">Leasing partners</div>
            <div className="font-body text-[12px] text-admin-text-muted">{partnerCount ?? 0} active</div>
          </div>
        </Link>
        <Link href="/admin/car-hire/vehicles" className="flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-colors hover:border-admin-green/40">
          <CarFront className="h-5 w-5 text-admin-green-text" strokeWidth={1.75} />
          <div>
            <div className="font-body text-sm font-semibold text-admin-text">Hire vehicles</div>
            <div className="font-body text-[12px] text-admin-text-muted">{vehicleCount ?? 0} listed</div>
          </div>
        </Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Active partners" value={partnerCount ?? 0} />
        <MiniStat label="Vehicles" value={vehicleCount ?? 0} />
        <MiniStat label="Bookings" value={list.length} />
        <MiniStat label="Awaiting action" value={openCount} />
      </div>

      <h2 className="mb-3 font-body text-sm font-semibold text-admin-text">Booking requests</h2>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No car-hire bookings yet. Requests from customers will appear here for you to confirm availability, assign a driver, and invoice.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {list.map((b) => {
            const status = String(b.status);
            return (
              <div key={String(b.id)} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-body text-sm font-semibold text-admin-text">{custName[String(b.customer_user_id)] ?? '—'}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (STATUS_PILL[status] ?? 'bg-admin-bg text-admin-text-muted')}>{status}</span>
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                    {b.vehicle_id ? (vehLabel[String(b.vehicle_id)] ?? 'Vehicle') : 'No vehicle'}
                    {' · '}{fmtDate(String(b.start_date))} → {fmtDate(String(b.end_date))}
                    {' · '}{String(b.days)}d × {String(b.hours_per_day)}h
                    {b.offer_total ? ` · ${formatNaira(Number(b.offer_total))}` : b.indicative_total ? ` · ~${formatNaira(Number(b.indicative_total))}` : ''}
                  </div>
                </div>
                <CarHireBookingActions
                  bookingId={String(b.id)}
                  status={status}
                  hasVehicle={Boolean(b.vehicle_id)}
                  assignedDriverId={b.assigned_driver_id ? String(b.assigned_driver_id) : null}
                  paymentLink={b.payment_link ? String(b.payment_link) : null}
                  drivers={drivers}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
