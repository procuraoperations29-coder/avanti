import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ArrowRight, Wallet } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';

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

  // Payouts state — check both released batches and unbatched engagements
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
  const unbatchedGross = unbatched.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  );

  // Aggregations for the summary stats
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

  // Driver + customer name lookup for the table
  const driverIds = Array.from(
    new Set(
      completed
        .map((e: { driver_id: string | null }) => e.driver_id)
        .filter(Boolean)
    )
  ) as string[];
  const customerIds = Array.from(
    new Set(
      completed
        .map((e: { customer_user_id: string | null }) => e.customer_user_id)
        .filter(Boolean)
    )
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
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Admin
        </Link>

        <SectionLabel>Finance</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">Money in, money out.</em>
        </h1>

        {/* ─── PAYOUT BATCHES ─── */}
        <div className="mb-10 border-2 border-ink bg-paper-2 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-ink" strokeWidth={1.5} />
            <SectionLabel>Payout batches</SectionLabel>
          </div>

          <div className="mb-6 grid gap-6 md:grid-cols-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
                Ready to batch
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-ink">
                {formatNaira(unbatchedGross)}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">
                {unbatched.length} engagement{unbatched.length === 1 ? '' : 's'} unpaid
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Batches created
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-ink">
                {batches.length}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">
                {completedBatches.length} completed
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
                Released to date
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-ink">
                {formatNaira(totalReleased)}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">
                Net paid, after WHT
              </div>
            </div>
          </div>

          <Link
            href="/admin/finance/batches"
            className="inline-flex items-center gap-2 border border-ink bg-ink px-5 py-2.5 font-body text-sm text-paper transition-colors hover:bg-ink-2"
          >
            {unbatched.length > 0 ? 'Manage batches' : 'View batches'}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>

        {/* ─── REVENUE STATS ─── */}
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Gross this month
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {formatNaira(grossThisMonth)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Customer payments captured
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Commission this month
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {formatNaira(commissionThisMonth)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Avanti&apos;s revenue
            </div>
          </div>
        </div>

        {/* ─── COMPLETED ENGAGEMENTS TABLE ─── */}
        <div>
          <SectionLabel>Completed engagements · {completed.length}</SectionLabel>

          {completed.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center">
              <p className="font-body text-sm text-ink-muted">
                No completed engagements yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Gross
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Payout
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Commission
                    </th>
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
                    <tr
                      key={e.id}
                      className="border-b border-line last:border-0 hover:bg-paper-2"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {e.completed_at
                          ? new Date(e.completed_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
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
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(e.customer_price_total ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(e.driver_payout_total ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(e.commission_total ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
