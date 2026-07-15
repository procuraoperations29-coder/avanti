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

const STATUS_STYLE: Record<string, string> = {
  batched: 'text-brass',
  initiated: 'text-brass',
  completed: 'text-green',
  failed: 'text-oxblood',
  reversed: 'text-oxblood',
  held: 'text-oxblood',
};

export default async function DriverEarningsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!profile) redirect('/driver/onboarding/pending');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payoutsData } = await (admin as any)
    .from('payouts')
    .select('*')
    .eq('driver_id', profile.id)
    .order('created_at', { ascending: false });

  const payouts = payoutsData ?? [];

  const paidPayouts = payouts.filter((p: { status: string }) => p.status === 'completed');
 const pendingPayouts = payouts.filter((p: { status: string }) =>
    ['batched', 'initiated'].includes(p.status)
  );

  const totalPaid = paidPayouts.reduce(
    (sum: number, p: { net_amount: number }) => sum + Number(p.net_amount ?? 0),
    0
  );
  const totalPendingBatched = pendingPayouts.reduce(
    (sum: number, p: { net_amount: number }) => sum + Number(p.net_amount ?? 0),
    0
  );
  const totalWht = paidPayouts.reduce(
    (sum: number, p: { tax_withheld_total: number }) =>
      sum + Number(p.tax_withheld_total ?? 0),
    0
  );

  // Completed engagements not yet in any active payout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: completed } = await (admin as any)
    .from('engagements')
    .select('id, driver_payout_total')
    .eq('driver_id', profile.id)
    .eq('status', 'completed');

  const activePayoutEngagementIds = new Set(
    payouts
      .filter((p: { status: string }) => !['failed', 'reversed'].includes(p.status))
      .map((p: { engagement_id: string | null }) => p.engagement_id)
      .filter(Boolean)
  );

  const unbatched = (completed ?? []).filter(
    (e: { id: string }) => !activePayoutEngagementIds.has(e.id)
  );
  const unbatchedGross = unbatched.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  );
  const unbatchedNet = unbatchedGross * 0.95;

  // Batch info to backfill completed_at for older payouts
  const batchIds = Array.from(
    new Set(payouts.map((p: { batch_id: string | null }) => p.batch_id).filter(Boolean))
  ) as string[];
  let batchesById: Record<string, { executed_at: string | null }> = {};
  if (batchIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: batches } = await (admin as any)
      .from('payout_batches')
      .select('id, executed_at')
      .in('id', batchIds);
    batchesById = Object.fromEntries(
      (batches ?? []).map((b: { id: string; executed_at: string | null }) => [
        b.id,
        { executed_at: b.executed_at },
      ])
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-6 pt-8 pb-20">
        <Link
          href="/driver"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Home
        </Link>

        <SectionLabel>Earnings</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">What you&apos;ve made.</em>
        </h1>

        {/* Top-line stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="border-2 border-green bg-green-soft p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
              Paid to date
            </div>
            <div className="mt-3 font-display text-3xl leading-none text-ink">
              {formatNaira(totalPaid)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              {paidPayouts.length} payout{paidPayouts.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="border-2 border-brass bg-brass-soft p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              Pending
            </div>
            <div className="mt-3 font-display text-3xl leading-none text-ink">
              {formatNaira(totalPendingBatched + unbatchedNet)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              {pendingPayouts.length + unbatched.length} engagement
              {pendingPayouts.length + unbatched.length === 1 ? '' : 's'} awaiting payout
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Tax withheld
            </div>
            <div className="mt-3 font-display text-3xl leading-none text-ink">
              {formatNaira(totalWht)}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              5% WHT remitted to FIRS
            </div>
          </div>
        </div>

        {/* Payout history */}
        <div className="mb-10">
          <SectionLabel>Payout history · {payouts.length}</SectionLabel>
          {payouts.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center">
              <p className="font-body text-sm text-ink-muted">
                No payouts yet. Once your completed engagements are batched by our finance
                team, they&apos;ll appear here.
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
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Gross
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      WHT
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p: {
                    id: string;
                    completed_at: string | null;
                    batch_id: string | null;
                    created_at: string;
                    status: string;
                    gross_payout: number;
                    tax_withheld_total: number;
                    net_amount: number;
                  }) => {
                    const displayDate = p.completed_at
                      ? new Date(p.completed_at)
                      : p.batch_id && batchesById[p.batch_id]?.executed_at
                      ? new Date(batchesById[p.batch_id].executed_at!)
                      : new Date(p.created_at);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-line last:border-0 hover:bg-paper-2"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                          {displayDate.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              'font-mono text-[10px] uppercase tracking-wider ' +
                              (STATUS_STYLE[p.status] ?? 'text-ink-muted')
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                          {formatNaira(Number(p.gross_payout))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-ink-muted">
                          {formatNaira(Number(p.tax_withheld_total))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-ink">
                          {formatNaira(Number(p.net_amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            How payouts work
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Every completed engagement gets rolled into a weekly payout batch. We deduct
            5% withholding tax (remitted to FIRS on your behalf) and transfer the net
            amount to your bank account. Batches are typically released Fridays.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
