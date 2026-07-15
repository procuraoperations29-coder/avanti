import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
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

  // Completed engagements — the finance data
  const { data: engagements } = await admin
    .from('engagements')
    .select('id, customer_price_total, driver_payout_total, commission_total, currency, completed_at, driver_id, customer_user_id, engagement_type')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(100);

  const completed = engagements ?? [];

  // Captured payments — for gross revenue
  const { data: paymentsData } = await admin
    .from('payments')
    .select('gross_amount, currency, captured_at')
    .eq('status', 'captured');

  const captured = paymentsData ?? [];

  // Aggregations
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const thisMonthCompleted = completed.filter(
    (e) => e.completed_at && new Date(e.completed_at) >= monthStart
  );
  const thisMonthCaptured = captured.filter(
    (p) => p.captured_at && new Date(p.captured_at) >= monthStart
  );

  const commissionThisMonth = thisMonthCompleted.reduce(
    (sum, e) => sum + Number(e.commission_total ?? 0),
    0
  );
  const grossThisMonth = thisMonthCaptured.reduce(
    (sum, p) => sum + Number(p.gross_amount ?? 0),
    0
  );
  const pendingPayouts = completed.reduce(
    (sum, e) => sum + Number(e.driver_payout_total ?? 0),
    0
  );

  // Look up driver + customer names
  const driverIds = Array.from(new Set(completed.map((e) => e.driver_id).filter(Boolean)));
  const customerIds = Array.from(new Set(completed.map((e) => e.customer_user_id).filter(Boolean)));

  let driverNames: Record<string, string> = {};
  let customerNames: Record<string, string> = {};

  if (driverIds.length > 0) {
    const { data: drivers } = await admin
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverIds as string[]);
    if (drivers && drivers.length > 0) {
      const userIds = drivers.map((d) => d.user_id).filter(Boolean);
      const { data: users } = await admin
        .from('users')
        .select('id, full_name')
        .in('id', userIds as string[]);
      const userNameMap = Object.fromEntries(
        (users ?? []).map((u) => [u.id, u.full_name ?? 'Driver'])
      );
      driverNames = Object.fromEntries(
        drivers.map((d) => [d.id, userNameMap[d.user_id ?? ''] ?? 'Driver'])
      );
    }
  }

  if (customerIds.length > 0) {
    const { data: customers } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', customerIds as string[]);
    customerNames = Object.fromEntries(
      (customers ?? []).map((c) => [c.id, c.full_name ?? 'Customer'])
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

        {/* Stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
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
          <div className="border-2 border-brass bg-brass-soft p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              Pending payouts
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {formatNaira(pendingPayouts)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Owed to drivers · Slice 8 will batch these
            </div>
          </div>
        </div>

        {/* Completed engagements table */}
        <div>
          <SectionLabel>Completed engagements · {completed.length}</SectionLabel>

          {completed.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center">
              <p className="font-body text-sm text-ink-muted">
                No completed engagements yet. When drivers complete their engagements,
                they&apos;ll appear here with full financial breakdown.
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
                  {completed.slice(0, 25).map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0 hover:bg-paper-2">
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

        {/* Coming soon */}
        <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Coming
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Automated payout batching every Friday. 5% withholding tax deducted at source
            and remitted to FIRS. Individual driver statements. Refund workflow for
            disputed engagements. Rate card management. Reconciliation reports.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
