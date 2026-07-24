import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { CreateBatchButton } from './create-batch-button';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-brass',
  approved: 'text-brass',
  released: 'text-green',
  completed: 'text-green',
  cancelled: 'text-oxblood',
};

export default async function PayoutBatchesPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_finance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: batches } = await (admin as any)
    .from('payout_batches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: unpaid } = await (admin as any)
    .from('engagements')
    .select('id, driver_payout_total, driver_id')
    .eq('status', 'completed')
    .gt('driver_payout_total', 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingPayouts } = await (admin as any)
    .from('payouts')
    .select('engagement_id, status');

  const activeBatchedIds = new Set(
    (existingPayouts ?? [])
      .filter((p: { status: string }) => !['failed', 'reversed'].includes(p.status))
      .map((p: { engagement_id: string }) => p.engagement_id)
      .filter(Boolean)
  );

  const unbatched = (unpaid ?? []).filter(
    (e: { id: string }) => !activeBatchedIds.has(e.id)
  );

  // Not every "unbatched" engagement will actually make it into the next
  // batch — fn_build_payout_batch requires the driver to have a verified
  // payout method on file (payouts.payout_method_id is NOT NULL) and
  // silently skips anyone who doesn't. Check here so the number shown
  // never disagrees with what actually gets built.
  const driverIdsInUnbatched = Array.from(
    new Set(unbatched.map((e: { driver_id: string }) => e.driver_id))
  );

  let driversWithPayoutMethod = new Set<string>();
  if (driverIdsInUnbatched.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: methods } = await (admin as any)
      .from('driver_payout_methods')
      .select('driver_id')
      .in('driver_id', driverIdsInUnbatched)
      .is('deleted_at', null);
    driversWithPayoutMethod = new Set(
      (methods ?? []).map((m: { driver_id: string }) => m.driver_id)
    );
  }

  const ready = unbatched.filter((e: { driver_id: string }) =>
    driversWithPayoutMethod.has(e.driver_id)
  );
  const blocked = unbatched.filter(
    (e: { driver_id: string }) => !driversWithPayoutMethod.has(e.driver_id)
  );

  const readyTotal = ready.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  );
  const readyDrivers = new Set(ready.map((e: { driver_id: string }) => e.driver_id)).size;

  const blockedTotal = blocked.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  );
  const blockedDrivers = new Set(blocked.map((e: { driver_id: string }) => e.driver_id)).size;

  const list = batches ?? [];

  return (
    <div className="mx-auto max-w-5xl pb-20">
        <Link
          href="/admin/finance"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Finance
        </Link>

        <SectionLabel>Payout batches</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">Money out.</em>
        </h1>

        {/* Ready to batch */}
        <div className="mb-4 border-2 border-ink bg-paper-2 p-6">
          <div className="flex items-baseline justify-between gap-6">
            <div className="flex-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                Ready to batch
              </div>
              <div className="mt-3 font-display text-4xl leading-none text-ink">
                {formatNaira(readyTotal)}
              </div>
              <div className="mt-3 font-mono text-xs text-ink-muted">
                {ready.length} engagement{ready.length === 1 ? '' : 's'} across{' '}
                {readyDrivers} driver{readyDrivers === 1 ? '' : 's'}
                {' · '}Gross, before 5% WHT
              </div>
            </div>
            <CreateBatchButton disabled={ready.length === 0} />
          </div>
          {ready.length === 0 && blocked.length === 0 && (
            <p className="mt-4 font-body text-sm text-ink-muted">
              No unpaid completed engagements. Come back after drivers complete more work.
            </p>
          )}
        </div>

        {/* Blocked — missing payout method */}
        {blocked.length > 0 && (
          <div className="mb-10 flex items-start gap-3 border-l-2 border-oxblood bg-paper-2 px-6 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-oxblood" strokeWidth={1.5} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-oxblood">
                Blocked — missing payout method
              </div>
              <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
                {formatNaira(blockedTotal)} across {blocked.length} engagement
                {blocked.length === 1 ? '' : 's'} ({blockedDrivers} driver
                {blockedDrivers === 1 ? '' : 's'}) won&apos;t be included in the next
                batch — the driver hasn&apos;t added a verified payout method yet. Ask
                them to complete that step in onboarding, then re-run the batch.
              </p>
            </div>
          </div>
        )}

        {/* Batches list */}
        <SectionLabel>All batches · {list.length}</SectionLabel>

        {list.length === 0 ? (
          <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
            No batches yet. Create one above once completed engagements exist.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full">
              <thead className="border-b border-line bg-paper-2">
                <tr>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Scheduled
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Payouts
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    Net
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((b: {
                  id: string;
                  created_at: string;
                  scheduled_for: string;
                  status: string;
                  payout_count: number;
                  total_gross: number | null;
                  total_net: number | null;
                }) => (
                  <tr key={b.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {new Date(b.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                      {new Date(b.scheduled_for).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'font-mono text-[10px] uppercase tracking-wider ' +
                          (STATUS_STYLE[b.status] ?? 'text-ink-muted')
                        }
                      >
                        {b.status}
                        {b.payout_count === 0 && (
                          <span className="ml-2 text-oxblood">· empty</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                      {b.payout_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink-muted">
                      {formatNaira(Number(b.total_gross ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                      {formatNaira(Number(b.total_net ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/finance/batches/${b.id}`}
                        className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
                      >
                        Open
                        <ChevronRight className="h-3 w-3" strokeWidth={2} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            How this works
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Create batch → review payouts → release. Releasing flips all pending payouts
            to completed at the database level and records the audit trail. Actual money
            movement happens out-of-band for now — Ops uploads to your bank portal after
            release. Real Paystack Transfers integration comes next.
          </p>
        </div>
    </div>
  );
}
