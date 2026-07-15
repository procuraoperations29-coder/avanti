import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { ReleaseBatchButton } from './release-batch-button';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const ITEM_STATUS_STYLE: Record<string, string> = {
  pending: 'text-brass',
  processing: 'text-brass',
  completed: 'text-green',
  failed: 'text-oxblood',
  reversed: 'text-oxblood',
};

export default async function PayoutBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;

  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batch } = await (admin as any)
    .from('payout_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (!batch) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payouts } = await (admin as any)
    .from('payouts')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  const allPayouts = payouts ?? [];

  // Look up driver names via driver_profiles.user_id -> users.full_name
  const driverProfileIds = Array.from(
    new Set(allPayouts.map((p: { driver_id: string }) => p.driver_id))
  );

  let driverNames: Record<string, string> = {};
  if (driverProfileIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverProfileIds);

    const userIds = (profiles ?? [])
      .map((p: { user_id: string | null }) => p.user_id)
      .filter(Boolean) as string[];

    if (userIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: usersData } = await (admin as any)
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      const nameByUserId = Object.fromEntries(
        (usersData ?? []).map((u: { id: string; full_name: string | null }) => [
          u.id,
          u.full_name ?? 'Driver',
        ])
      );

      driverNames = Object.fromEntries(
        (profiles ?? []).map((p: { id: string; user_id: string | null }) => [
          p.id,
          nameByUserId[p.user_id ?? ''] ?? 'Driver',
        ])
      );
    }
  }

  // Count distinct drivers
  const distinctDrivers = new Set(
    allPayouts.map((p: { driver_id: string }) => p.driver_id)
  ).size;

  const canRelease = batch.status === 'draft' || batch.status === 'approved';

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/admin/finance/batches"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Batches
        </Link>

        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <SectionLabel>Batch · {batch.status}</SectionLabel>
            <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
              Scheduled{' '}
              {new Date(batch.scheduled_for).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h1>
            <p className="mt-2 font-mono text-xs text-ink-muted">
              Created {new Date(batch.created_at).toLocaleString()}
              {batch.executed_at &&
                ` · Executed ${new Date(batch.executed_at).toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Totals */}
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          <div className="border border-line bg-paper-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Gross
            </div>
            <div className="mt-2 font-display text-2xl leading-none text-ink">
              {formatNaira(Number(batch.total_gross ?? 0))}
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              WHT (5%)
            </div>
            <div className="mt-2 font-display text-2xl leading-none text-ink">
              {formatNaira(Number(batch.total_tax_withheld ?? 0))}
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-muted">To remit to FIRS</div>
          </div>
          <div className="border-2 border-brass bg-brass-soft p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
              Net paid to drivers
            </div>
            <div className="mt-2 font-display text-2xl leading-none text-ink">
              {formatNaira(Number(batch.total_net ?? 0))}
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Recipients
            </div>
            <div className="mt-2 font-display text-2xl leading-none text-ink">
              {distinctDrivers}
            </div>
            <div className="mt-1 font-mono text-[10px] text-ink-muted">
              {batch.payout_count} payout{batch.payout_count === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Release action */}
        {canRelease && (
          <div className="mb-10 border-2 border-ink bg-paper-2 p-6">
            <SectionLabel>Ready to release</SectionLabel>
            <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-ink">
              Review the payouts below. When you release, every pending payout is marked
              completed and the audit trail is written. Actual money transfer happens
              out-of-band — upload to your bank portal after release.
            </p>
            <div className="mt-6">
              <ReleaseBatchButton batchId={batchId} />
            </div>
          </div>
        )}

        {batch.status === 'completed' && (
          <div className="mb-10 border-l-2 border-green bg-green-soft px-6 py-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
              Released
            </div>
            <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
              This batch has been released. All payouts are marked completed. Complete the
              bank transfer separately if not already done.
            </p>
          </div>
        )}

        {/* Payouts table */}
        <div>
          <SectionLabel>Payouts · {allPayouts.length}</SectionLabel>
          {allPayouts.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No payouts in this batch.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Driver
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
                      Penalties
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Net
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allPayouts.map((item: {
                    id: string;
                    driver_id: string;
                    status: string;
                    gross_payout: number;
                    tax_withheld_total: number;
                    penalties_deducted: number;
                    net_amount: number;
                    engagement_id: string | null;
                  }) => (
                    <tr
                      key={item.id}
                      className="border-b border-line last:border-0 hover:bg-paper-2"
                    >
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {driverNames[item.driver_id] ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'font-mono text-[10px] uppercase tracking-wider ' +
                            (ITEM_STATUS_STYLE[item.status] ?? 'text-ink-muted')
                          }
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(item.gross_payout))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink-muted">
                        {formatNaira(Number(item.tax_withheld_total))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink-muted">
                        {formatNaira(Number(item.penalties_deducted ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(item.net_amount))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {item.engagement_id ? item.engagement_id.slice(0, 8) : '—'}
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
