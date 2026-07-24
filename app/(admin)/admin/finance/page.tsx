import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/avanti/admin/stat-card';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function AdminFinancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

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

  return (
    <>
      <Link
            href="/admin"
            className="mb-4 inline-block font-body text-[13px] text-ink-muted hover:text-ink"
          >
            ← Admin
          </Link>
          <p className="mb-6 font-body text-lg font-medium text-ink">
            Money in, money out
          </p>

          <div className="mb-6 rounded-xl border border-line bg-paper-2 p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-ink" strokeWidth={1.75} />
              <span className="font-body text-[13px] font-medium text-ink">Payout batches</span>
            </div>

            <div className="mb-5 grid gap-5 md:grid-cols-3">
              <div>
                <div className="font-body text-[11px] uppercase tracking-wide text-brass-text">
                  Ready to batch
                </div>
                <div className="mt-1.5 font-body text-2xl font-medium text-ink">
                  {formatNaira(unbatchedGross)}
                </div>
                <div className="mt-1.5 font-body text-[12px] text-ink-muted">
                  {readyToBatchRows.length} engagement{readyToBatchRows.length === 1 ? '' : 's'} unpaid
                  {blockedCount > 0 && (
                    <> · {blockedCount} blocked (no payout method)</>
                  )}
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] uppercase tracking-wide text-ink-muted">
                  Batches created
                </div>
                <div className="mt-1.5 font-body text-2xl font-medium text-ink">{batches.length}</div>
                <div className="mt-1.5 font-body text-[12px] text-ink-muted">
                  {completedBatches.length} completed
                </div>
              </div>
              <div>
                <div className="font-body text-[11px] uppercase tracking-wide text-green-text">
                  Released to date
                </div>
                <div className="mt-1.5 font-body text-2xl font-medium text-ink">
                  {formatNaira(totalReleased)}
                </div>
                <div className="mt-1.5 font-body text-[12px] text-ink-muted">Net paid, after WHT</div>
              </div>
            </div>

            <Link
              href="/admin/finance/batches"
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 font-body text-sm text-white transition-colors hover:bg-ink-2"
            >
              {unbatched.length > 0 ? 'Manage batches' : 'View batches'}
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="mb-8 grid gap-3 md:grid-cols-2">
            <StatCard label="Gross this month" value={formatNaira(grossThisMonth)} subtext="Customer payments captured" />
            <StatCard label="Commission this month" value={formatNaira(commissionThisMonth)} subtext="Avanti's revenue" />
          </div>

          <div>
            <p className="mb-3 font-body text-[13px] font-medium text-ink">
              Completed engagements · {completed.length}
            </p>

            {completed.length === 0 ? (
              <div className="rounded-xl border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
                No completed engagements yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full bg-paper-2">
                  <thead className="border-b border-line bg-paper">
                    <tr>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-ink-muted">Date</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-ink-muted">Type</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-ink-muted">Driver</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-ink-muted">Customer</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-ink-muted">Gross</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-ink-muted">Payout</th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-ink-muted">Commission</th>
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
                      <tr key={e.id} className="border-b border-line last:border-0 hover:bg-paper">
                        <td className="px-4 py-3 font-body text-[12px] text-ink-muted">
                          {e.completed_at
                            ? new Date(e.completed_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short', year: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm capitalize text-ink">
                          {e.engagement_type?.replace(/_/g, ' ') ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-ink">
                          {driverNames[e.driver_id ?? ''] ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-ink">
                          {customerNames[e.customer_user_id ?? ''] ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm text-ink">
                          {formatNaira(Number(e.customer_price_total ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm text-ink">
                          {formatNaira(Number(e.driver_payout_total ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm text-ink">
                          {formatNaira(Number(e.commission_total ?? 0))}
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
