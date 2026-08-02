import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CalendarDays, UserCheck } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/avanti/empty-state';
import { EngagementCard } from '@/components/customer/engagement-card';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { Button } from '@/components/ui/button';

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PLACEMENT_STATUS: Record<string, string> = {
  pending: 'bg-admin-amber-soft text-admin-amber-text',
  active: 'bg-admin-green-soft text-admin-green-text',
  ended: 'bg-admin-bg text-admin-text-muted',
  cancelled: 'bg-red-500/12 text-red-600',
};

export default async function EngagementsListPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('individual_customer')) redirect('/sign-in');

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('v_engagements_customer')
    .select('id, driver_name, engagement_type, status, starts_at, currency, customer_price_total')
    .eq('customer_user_id', user.id)
    .order('starts_at', { ascending: false });
  const items = rows ?? [];

  // Permanent placements live in their own table (monthly-salaried), not
  // `engagements` — the driver dashboard already surfaces these; the customer
  // side didn't, so a matched placement was invisible to the customer.
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: placementRows } = await (admin as any)
    .from('placements')
    .select('id, driver_id, monthly_salary, currency, start_date, status')
    .eq('customer_user_id', user.id)
    .in('status', ['pending', 'active'])
    .order('start_date', { ascending: false });
  const placements = placementRows ?? [];

  // Unpaid placement invoices (upfront / monthly), so the customer can pay.
  const placementIds = placements.map((p: { id: string }) => p.id);
  let invoiceByPlacement: Record<string, { amount: number; kind: string; payment_link: string | null; status: string }> = {};
  if (placementIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invoices } = await (admin as any)
      .from('placement_invoices')
      .select('placement_id, amount, kind, payment_link, status, payment_status, due_date')
      .in('placement_id', placementIds)
      .eq('payment_status', 'unpaid')
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true });
    for (const inv of invoices ?? []) {
      if (!invoiceByPlacement[inv.placement_id]) {
        invoiceByPlacement[inv.placement_id] = {
          amount: Number(inv.amount ?? 0),
          kind: inv.kind,
          payment_link: inv.payment_link,
          status: inv.status,
        };
      }
    }
  }

  // Driver names for the placements.
  const driverIds = Array.from(new Set(placements.map((p: { driver_id: string }) => p.driver_id)));
  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverIds);
    const userIds = (profiles ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dUsers } = userIds.length
      ? await (admin as any).from('users').select('id, full_name').in('id', userIds)
      : { data: [] };
    const nameByUser = Object.fromEntries((dUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    driverNames = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; user_id: string | null }) => [p.id, nameByUser[p.user_id ?? ''] ?? 'Driver'])
    );
  }

  const nothing = items.length === 0 && placements.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/customer"
        className="mb-4 inline-flex items-center gap-1 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Home
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">
          Your engagements
        </h1>
        <p className="mt-1 font-body text-[13px] text-admin-text-muted">
          Everything you&apos;ve booked.
        </p>
      </div>

      {/* Permanent placements */}
      {placements.length > 0 && (
        <div className="mb-8">
          <AdminSectionLabel>Permanent placements</AdminSectionLabel>
          <div className="space-y-3">
            {placements.map((p: {
              id: string;
              driver_id: string;
              monthly_salary: number;
              currency: string;
              start_date: string;
              status: string;
            }) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm"
              >
                <div className="flex items-center gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-admin-green-soft text-admin-green-text">
                    <UserCheck className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-body text-sm font-semibold text-admin-text">
                        {driverNames[p.driver_id] ?? 'Driver'}
                      </span>
                      <span
                        className={
                          'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' +
                          (PLACEMENT_STATUS[p.status] ?? 'bg-admin-bg text-admin-text-muted')
                        }
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                      Permanent driver · since {fmtDate(p.start_date)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-base font-semibold tabular-nums tracking-tight text-admin-text">
                      {formatNaira(Number(p.monthly_salary ?? 0))}
                    </div>
                    <div className="font-body text-[11px] text-admin-text-muted">per month</div>
                  </div>
                </div>

                {invoiceByPlacement[p.id] && (
                  <div
                    className={
                      'flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 ' +
                      (invoiceByPlacement[p.id]!.status === 'overdue'
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-admin-amber/20 bg-admin-amber-soft')
                    }
                  >
                    <div className="font-body text-[13px] text-admin-text">
                      <span className="font-medium">
                        {invoiceByPlacement[p.id]!.kind === 'upfront' ? 'Upfront payment' : 'Salary payment'} due:
                      </span>{' '}
                      <span className="font-semibold tabular-nums">
                        {formatNaira(invoiceByPlacement[p.id]!.amount)}
                      </span>
                      {invoiceByPlacement[p.id]!.status === 'overdue' && (
                        <span className="ml-2 font-medium text-red-600">Overdue</span>
                      )}
                    </div>
                    {invoiceByPlacement[p.id]!.payment_link && (
                      <a
                        href={invoiceByPlacement[p.id]!.payment_link!}
                        className="inline-flex items-center gap-1 rounded-xl bg-admin-green px-3.5 py-2 font-body text-[13px] font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95"
                      >
                        Pay now
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On-demand bookings */}
      {nothing ? (
        <EmptyState
          Icon={CalendarDays}
          title="No engagements yet"
          description="Find a driver to make your first booking."
          action={
            <Link href="/customer/search">
              <Button size="sm">Find a driver</Button>
            </Link>
          }
        />
      ) : items.length > 0 ? (
        <div>
          {placements.length > 0 && <AdminSectionLabel>Bookings</AdminSectionLabel>}
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {items.map((e: {
              id: string;
              driver_name: string | null;
              engagement_type: string;
              status: string;
              starts_at: string;
              currency: string;
              customer_price_total: number | null;
            }) => (
              <EngagementCard
                key={e.id}
                engagementId={e.id}
                driverName={e.driver_name ?? 'Driver'}
                engagementType={e.engagement_type}
                status={e.status}
                startsAt={e.starts_at}
                currency={e.currency}
                customerPriceTotal={e.customer_price_total ?? 0}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
