import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { TripActions, type DriverOption } from './trip-actions';

const TIER_LABEL: Record<string, string> = { t1: 'T1', t2: 'T2', t3: 'T3', t4: 'T4' };

function fmtDateTime(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminTripsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canAccess =
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_verifier') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('super_admin');
  if (!canAccess) redirect('/admin');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requests } = await (admin as any)
    .from('trip_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  const list = requests ?? [];

  // Customer names
  const customerIds = Array.from(new Set(list.map((r: { customer_user_id: string }) => r.customer_user_id)));
  let customerNames: Record<string, string> = {};
  let customerHasEmail: Record<string, boolean> = {};
  if (customerIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (admin as any).from('users').select('id, full_name, email').in('id', customerIds);
    customerNames = Object.fromEntries((users ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Customer']));
    customerHasEmail = Object.fromEntries((users ?? []).map((u: { id: string; email: string | null }) => [u.id, Boolean(u.email)]));
  }

  // Approved, bookable drivers for the match dropdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driverProfiles } = await (admin as any)
    .from('driver_profiles')
    .select('id, user_id, verification_tier')
    .eq('verification_status', 'approved')
    .is('deleted_at', null)
    .eq('suspended', false)
    .limit(200);
  const driverUserIds = (driverProfiles ?? []).map((d: { user_id: string | null }) => d.user_id).filter(Boolean);
  let driverUserNames: Record<string, string> = {};
  if (driverUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dUsers } = await (admin as any).from('users').select('id, full_name').in('id', driverUserIds);
    driverUserNames = Object.fromEntries((dUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
  }
  const drivers: DriverOption[] = (driverProfiles ?? []).map(
    (d: { id: string; user_id: string; verification_tier: string }) => ({
      id: d.id,
      label: `${driverUserNames[d.user_id] ?? 'Driver'} · ${TIER_LABEL[d.verification_tier] ?? d.verification_tier}`,
    })
  );
  const driverNameById = Object.fromEntries(drivers.map((d) => [d.id, d.label]));

  const counts = {
    new: list.filter((r: { status: string }) => r.status === 'new').length,
    quoted: list.filter((r: { status: string }) => r.status === 'quoted').length,
    paid: list.filter((r: { status: string }) => r.status === 'paid').length,
  };

  return (
    <>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Admin"
        title="Out-of-state trips"
        subtitle="Inter-city driver requests — match, price, and invoice by hand"
      />

      <div className="mb-8 grid grid-cols-3 gap-3">
        <MiniStat label="New" value={counts.new} />
        <MiniStat label="Quoted" value={counts.quoted} />
        <MiniStat label="Paid" value={counts.paid} />
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No trip requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(
            (r: {
              id: string;
              customer_user_id: string;
              trip_type: string;
              origin_city: string;
              destinations: string[];
              departure_at: string;
              return_at: string | null;
              days: number | null;
              nights: number;
              vehicle_description: string;
              vehicle_class: string;
              transmission: string;
              passengers: number;
              daily_usage: string | null;
              accommodation: string;
              tier_preference: string | null;
              special_requirements: string | null;
              purpose: string | null;
              pickup_address: string;
              notes: string | null;
              contact_method: string;
              contact_detail: string;
              status: string;
              payment_status: string;
              payment_link: string | null;
              assigned_driver_id: string | null;
              offer_price: number | null;
              created_at: string;
            }) => {
              const route = [r.origin_city, ...(r.destinations ?? [])].join(' → ');
              return (
                <div key={r.id} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                  <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-display text-lg font-semibold tracking-tight text-admin-text">{route}</div>
                    <div className="font-body text-[12px] text-admin-text-muted">{fmtDateTime(r.created_at)}</div>
                  </div>

                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Customer" value={customerNames[r.customer_user_id] ?? '—'} />
                    <Detail label="Contact" value={`${r.contact_method}: ${r.contact_detail}`} />
                    <Detail
                      label="Trip"
                      value={`${r.trip_type === 'round_trip' ? 'Round trip' : 'One way'}${r.days ? ` · ${r.days} days` : ''}${r.nights ? ` · ${r.nights} nights` : ''}`}
                    />
                    <Detail label="Departure" value={fmtDateTime(r.departure_at)} />
                    <Detail label="Return" value={fmtDateTime(r.return_at)} />
                    <Detail label="Passengers" value={String(r.passengers)} />
                    <Detail label="Vehicle" value={`${r.vehicle_description} · ${r.vehicle_class} · ${r.transmission}`} />
                    <Detail
                      label="Accommodation"
                      value={r.accommodation === 'include_in_price' ? 'Include in price' : 'Customer arranges'}
                    />
                    <Detail label="Driver level" value={r.tier_preference ?? 'No preference'} />
                    <Detail label="Pickup" value={r.pickup_address} />
                    {r.purpose && <Detail label="Purpose" value={r.purpose} />}
                    {r.assigned_driver_id && (
                      <Detail label="Assigned" value={driverNameById[r.assigned_driver_id] ?? 'Driver'} />
                    )}
                  </div>

                  {(r.daily_usage || r.special_requirements || r.notes) && (
                    <div className="mt-4 space-y-2 border-t border-admin-border pt-4">
                      {r.daily_usage && <Note label="Daily usage" value={r.daily_usage} />}
                      {r.special_requirements && <Note label="Requirements" value={r.special_requirements} />}
                      {r.notes && <Note label="Notes" value={r.notes} />}
                    </div>
                  )}

                  <div className="mt-5 border-t border-admin-border pt-4">
                    <TripActions
                      tripId={r.id}
                      status={r.status}
                      paymentStatus={r.payment_status}
                      drivers={drivers}
                      customerHasEmail={customerHasEmail[r.customer_user_id] ?? false}
                      payLink={r.payment_link}
                    />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">{label}</div>
      <div className="mt-0.5 font-body text-sm text-admin-text">{value}</div>
    </div>
  );
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">{label}</div>
      <p className="mt-0.5 font-body text-sm leading-relaxed text-admin-text">{value}</p>
    </div>
  );
}
