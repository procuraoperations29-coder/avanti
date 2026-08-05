import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function AdminFinancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: engagementsData } = await (admin as any)
    .from('engagements')
    .select(
      'id, customer_price_total, driver_payout_total, commission_total, currency, completed_at, driver_id, customer_user_id, engagement_type'
    )
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100);

  const completed = engagementsData ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paymentsData } = await (admin as any)
    .from('payments')
    .select('gross_amount, currency, captured_at')
    .eq('status', 'captured');

  const captured = paymentsData ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batchesData } = await (admin as any)
    .from('payout_batches')
    .select('id, status, total_net, total_gross, payout_count, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const batches = batchesData ?? [];
  const completedBatches = batches.filter(
    (b: { status: string }) => b.status === 'completed'
  );
  const totalReleased = completedBatches.reduce(
    (sum: number, b: { total_net: number | null }) => sum + Number(b.total_net ?? 0),
    0
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingPayouts } = await (admin as any)
    .from('payouts')
    .select('engagement_id, status');

  const activeBatchedIds = new Set(
    (existingPayouts ?? [])
      .filter((p: { status: string }) => !['failed', 'reversed'].includes(p.status))
      .map((p: { engagement_id: string | null }) => p.engagement_id)
      .filter(Boolean)
  );

  const unbatched = completed.filter(
    (e: { id: string }) => !activeBatchedIds.has(e.id)
  );

  // Same driver_payout_methods filter as the batches page and dashboard KPI
  // — without it, this number can disagree with what actually gets batched
  // (that mismatch was the original "Ready to batch shows ₦86,400, batch
  // comes back with 0" bug).
  const unbatchedDriverIds = Array.from(
    new Set(unbatched.map((e: { driver_id: string | null }) => e.driver_id).filter(Boolean))
  );
  let driversWithPayoutMethod = new Set<string>();
  if (unbatchedDriverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: methods } = await (admin as any)
      .from('driver_payout_methods')
      .select('driver_id')
      .in('driver_id', unbatchedDriverIds)
      .is('deleted_at', null);
    driversWithPayoutMethod = new Set(
      (methods ?? []).map((m: { driver_id: string }) => m.driver_id)
    );
  }
  const readyToBatchRows = unbatched.filter(
    (e: { driver_id: string | null }) => e.driver_id && driversWithPayoutMethod.has(e.driver_id)
  );
  const unbatchedGross = readyToBatchRows.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  );
  const blockedCount = unbatched.length - readyToBatchRows.length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thisMonthCompleted = completed.filter(
    (e: { completed_at: string | null }) =>
      e.completed_at && new Date(e.completed_at) >= monthStart
  );
  const thisMonthCaptured = captured.filter(
    (p: { captured_at: string | null }) =>
      p.captured_at && new Date(p.captured_at) >= monthStart
  );

  const commissionThisMonth = thisMonthCompleted.reduce(
    (sum: number, e: { commission_total: number | null }) =>
      sum + Number(e.commission_total ?? 0),
    0
  );
  const grossThisMonth = thisMonthCaptured.reduce(
    (sum: number, p: { gross_amount: number | null }) =>
      sum + Number(p.gross_amount ?? 0),
    0
  );

  const driverIds = Array.from(
    new Set(completed.map((e: { driver_id: string | null }) => e.driver_id).filter(Boolean))
  ) as string[];
  const customerIds = Array.from(
    new Set(completed.map((e: { customer_user_id: string | null }) => e.customer_user_id).filter(Boolean))
  ) as string[];

  let driverNames: Record<string, string> = {};
  let customerNames: Record<string, string> = {};

  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: drivers } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverIds);
    const userIds = (drivers ?? [])
      .map((d: { user_id: string | null }) => d.user_id)
      .filter(Boolean) as string[];
    if (userIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: users } = await (admin as any)
        .from('users')
        .select('id, full_name')
        .in('id', userIds);
      const nameByUserId = Object.fromEntries(
        (users ?? []).map((u: { id: string; full_name: string | null }) => [
          u.id,
          u.full_name ?? 'Driver',
        ])
      );
      driverNames = Object.fromEntries(
        (drivers ?? []).map((d: { id: string; user_id: string | null }) => [
          d.id,
          nameByUserId[d.user_id ?? ''] ?? 'Driver',
        ])
      );
    }
  }

  if (customerIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customers } = await (admin as any)
      .from('users')
      .select('id, full_name')
      .in('id', customerIds);
    customerNames = Object.fromEntries(
      (customers ?? []).map((c: { id: string; full_name: string | null }) => [
        c.id,
        c.full_name ?? 'Customer',
      ])
    );
  }

  // Out-of-state trip invoices that have been paid. These are billed by hand
  // (not through the engagement/rate-card flow), so they don't appear in the
  // figures above — surface them separately here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paidTripsData } = await (admin as any)
    .from('trip_requests')
    .select('offer_price, paid_at, payment_status')
    .in('payment_status', ['paid', 'manual_paid']);
  const paidTrips = paidTripsData ?? [];
  const tripRevenueTotal = paidTrips.reduce(
    (s: number, t: { offer_price: number | null }) => s + Number(t.offer_price ?? 0),
    0
  );
  const tripRevenueThisMonth = paidTrips
    .filter((t: { paid_at: string | null }) => t.paid_at && new Date(t.paid_at) >= monthStart)
    .reduce((s: number, t: { offer_price: number | null }) => s + Number(t.offer_price ?? 0), 0);

  // Corporate invoices that have been paid (upfront + monthly), online or by
  // manual bank-transfer confirmation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paidCorpData } = await (admin as any)
    .from('corporate_invoices')
    .select('amount, paid_at, payment_status')
    .in('payment_status', ['paid', 'manual_paid']);
  const paidCorp = paidCorpData ?? [];
  const corpRevenueTotal = paidCorp.reduce((s: number, c: { amount: number | null }) => s + Number(c.amount ?? 0), 0);
  const corpRevenueThisMonth = paidCorp
    .filter((c: { paid_at: string | null }) => c.paid_at && new Date(c.paid_at) >= monthStart)
    .reduce((s: number, c: { amount: number | null }) => s + Number(c.amount ?? 0), 0);

  // Permanent-placement invoices paid. Placements are VAT-free to the customer:
  // upfront = 70% fee (all Avanti revenue); monthly = the driver's salary, from
  // which Avanti keeps a 15% commission (driver gets 85%). So Avanti's real take
  // is the full upfront fee plus 15% of each monthly salary — NOT the salary
  // pass-through.
  const PLACEMENT_COMMISSION = 0.15;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: paidPlacData } = await (admin as any)
    .from('placement_invoices')
    .select('amount, kind, paid_at, payment_status')
    .in('payment_status', ['paid', 'manual_paid']);
  const paidPlac = paidPlacData ?? [];
  const placementTake = (p: { amount: number | null; kind: string }) =>
    p.kind === 'upfront' ? Number(p.amount ?? 0) : Math.round(Number(p.amount ?? 0) * PLACEMENT_COMMISSION);
  const placementRevenueThisMonth = paidPlac
    .filter((p: { paid_at: string | null }) => p.paid_at && new Date(p.paid_at) >= monthStart)
    .reduce((s: number, p: { amount: number | null; kind: string }) => s + placementTake(p), 0);
  const placementRevenueTotal = paidPlac.reduce((s: number, p: { amount: number | null; kind: string }) => s + placementTake(p), 0);

  // The true headline: everything captured this month.
  const totalRevenueThisMonth = grossThisMonth + tripRevenueThisMonth + corpRevenueThisMonth + placementRevenueThisMonth;

  // All-time revenue: every captured engagement payment + every paid trip,
  // corporate, and placement invoice, across all time.
  const grossTotal = captured.reduce(
    (sum: number, p: { gross_amount: number | null }) => sum + Number(p.gross_amount ?? 0),
    0
  );
  const totalRevenueAllTime = grossTotal + tripRevenueTotal + corpRevenueTotal + placementRevenueTotal;

  // VAT (7.5%). All customer charges are treated as VAT-inclusive, so the VAT
  // portion is the tax fraction of the gross amount — money Avanti collects on
  // FIRS's behalf and must remit, NOT revenue. `vatOf` extracts it from a
  // VAT-inclusive total.
  const VAT_RATE = 0.075;
  const vatOf = (grossInclusive: number) => Math.round((grossInclusive * VAT_RATE) / (1 + VAT_RATE));
  // VAT applies to engagements, trips, and corporate invoices (all VAT-inclusive).
  // Placements are excluded — the salary pass-through is not a VATable supply.
  const vatCollectedThisMonth = vatOf(grossThisMonth + tripRevenueThisMonth + corpRevenueThisMonth);
  const vatCollectedAllTime = vatOf(grossTotal + tripRevenueTotal + corpRevenueTotal);
  // Commission shown ex-VAT: the engagement commission_total still bundles VAT,
  // so strip the VAT portion of engagement gross out of it.
  const commissionExVatThisMonth = commissionThisMonth - vatOf(grossThisMonth);

  return (
    <>
          <AdminPageHeader
            backHref="/admin"
            backLabel="Admin"
            title="Finance"
            subtitle="Money in, money out"
          />

          <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-admin-green-soft">
                <Wallet className="h-[18px] w-[18px] text-admin-green-text" strokeWidth={2} />
              </span>
              <span className="font-display text-[15px] font-semibold text-admin-text">Payout batches</span>
            </div>

            <div className="mb-5 grid gap-5 md:grid-cols-3">
              <div>
                <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-amber-text">
                  Ready to batch
                </div>
                <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-admin-text">
                  {formatNaira(unbatchedGross)}
                </div>
                <div className="mt-1.5 font-body text-[12px] text-admin-text-muted">
                  {readyToBatchRows.length} engagement{readyToBatchRows.length === 1 ? '' : 's'} unpaid
                  {blockedCount > 0 && (
                    <> · {blockedCount} blocked (no payout method)</>
                  )}
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                  Batches created
                </div>
                <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-admin-text">{batches.length}</div>
                <div className="mt-1.5 font-body text-[12px] text-admin-text-muted">
                  {completedBatches.length} completed
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
                  Released to date
                </div>
                <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-admin-text">
                  {formatNaira(totalReleased)}
                </div>
                <div className="mt-1.5 font-body text-[12px] text-admin-text-muted">Net paid, after WHT</div>
              </div>
            </div>

            <Link
              href="/admin/finance/batches"
              className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-5 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2"
            >
              {unbatched.length > 0 ? 'Manage batches' : 'View batches'}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="mb-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Total revenue this month"
              value={formatNaira(totalRevenueThisMonth)}
              subtext="Everything captured — all streams"
              tone={totalRevenueThisMonth > 0 ? 'accent' : 'default'}
            />
            <StatCard
              label="Total revenue (all time)"
              value={formatNaira(totalRevenueAllTime)}
              subtext="Every stream, since launch"
            />
            <StatCard
              label="VAT collected (to remit)"
              value={formatNaira(vatCollectedThisMonth)}
              subtext={`7.5%, all streams · ${formatNaira(vatCollectedAllTime)} all-time`}
              tone={vatCollectedThisMonth > 0 ? 'accent' : 'default'}
            />
            <StatCard label="Commission this month" value={formatNaira(commissionExVatThisMonth)} subtext="Ex-VAT · on-demand engagements" />
            <StatCard label="Engagements this month" value={formatNaira(grossThisMonth)} subtext="On-demand payments captured" />
            <StatCard label="Trips this month" value={formatNaira(tripRevenueThisMonth)} subtext="Out-of-state trips paid" />
            <StatCard label="Corporate this month" value={formatNaira(corpRevenueThisMonth)} subtext="Org invoices paid" />
            <StatCard label="Placements this month" value={formatNaira(placementRevenueThisMonth)} subtext="Fee + 15% commission · no VAT" />
          </div>

          <div>
            <AdminSectionLabel>Completed engagements · {completed.length}</AdminSectionLabel>

            {completed.length === 0 ? (
              <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
                No completed engagements yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-admin-border shadow-admin-sm">
                <table className="w-full bg-admin-card">
                  <thead className="border-b border-admin-border bg-admin-bg">
                    <tr>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Date</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Type</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Driver</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Customer</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Gross</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">VAT (7.5%)</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Payout</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completed.slice(0, 25).map((e: {
                      id: string;
                      completed_at: string | null;
                      engagement_type: string | null;
                      driver_id: string | null;
                      customer_user_id: string | null;
                      customer_price_total: number | null;
                      driver_payout_total: number | null;
                      commission_total: number | null;
                    }) => (
                      <tr key={e.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                        <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                          {e.completed_at
                            ? new Date(e.completed_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm capitalize text-admin-text">
                          {e.engagement_type?.replace(/_/g, ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-admin-text">
                          {driverNames[e.driver_id ?? ''] ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-admin-text">
                          {customerNames[e.customer_user_id ?? ''] ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                          {formatNaira(Number(e.customer_price_total ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text-muted">
                          {formatNaira(vatOf(Number(e.customer_price_total ?? 0)))}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                          {formatNaira(Number(e.driver_payout_total ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                          {formatNaira(Number(e.commission_total ?? 0) - vatOf(Number(e.customer_price_total ?? 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </>
  );
}
