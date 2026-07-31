import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { CreateBatchButton } from './create-batch-button';
import { RetryPayoutMethodsButton } from './retry-payout-methods-button';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-admin-amber-soft text-admin-amber-text',
  approved: 'bg-admin-amber-soft text-admin-amber-text',
  released: 'bg-admin-green-soft text-admin-green-text',
  completed: 'bg-admin-green-soft text-admin-green-text',
  cancelled: 'bg-red-500/12 text-red-600',
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
    <>
        <AdminPageHeader
          backHref="/admin/finance"
          backLabel="Finance"
          title="Payout batches"
          subtitle="Money out — build, review, release"
        />

        {/* Ready to batch */}
        <div className="mb-4 overflow-hidden rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex-1">
              <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
                Ready to batch
              </div>
              <div className="mt-3 font-display text-4xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
                {formatNaira(readyTotal)}
              </div>
              <div className="mt-3 font-body text-[12px] text-admin-text-muted">
                {ready.length} engagement{ready.length === 1 ? '' : 's'} across{' '}
                {readyDrivers} driver{readyDrivers === 1 ? '' : 's'}
                {' · '}Gross, before 5% WHT
              </div>
            </div>
            <CreateBatchButton disabled={ready.length === 0} />
          </div>
          {ready.length === 0 && blocked.length === 0 && (
            <p className="mt-4 font-body text-sm text-admin-text-muted">
              No unpaid completed engagements. Come back after drivers complete more work.
            </p>
          )}
        </div>

        {/* Blocked — missing payout method */}
        {blocked.length > 0 && (
          <div className="mb-10 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-6 py-4 shadow-admin-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={2} />
            <div className="flex-1">
              <div className="font-body text-[11px] font-medium uppercase tracking-wide text-red-600">
                Blocked — missing payout method
              </div>
              <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
                {formatNaira(blockedTotal)} across {blocked.length} engagement
                {blocked.length === 1 ? '' : 's'} ({blockedDrivers} driver
                {blockedDrivers === 1 ? '' : 's'}) won&apos;t be included in the next
                batch. If the driver already entered their payout details during
                onboarding, this was likely a data bug rather than a missing step —
                try the button below before asking them to redo anything.
              </p>
              <div className="mt-4">
                <RetryPayoutMethodsButton />
              </div>
            </div>
          </div>
        )}

        {/* Batches list */}
        <AdminSectionLabel>All batches · {list.length}</AdminSectionLabel>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
            No batches yet. Create one above once completed engagements exist.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-admin-border shadow-admin-sm">
            <table className="w-full bg-admin-card">
              <thead className="border-b border-admin-border bg-admin-bg">
                <tr>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Scheduled
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Payouts
                  </th>
                  <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Gross
                  </th>
                  <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
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
                  <tr key={b.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                    <td className="px-4 py-3 font-body text-[12px] tabular-nums text-admin-text-muted">
                      {new Date(b.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-body text-[12px] tabular-nums text-admin-text-muted">
                      {new Date(b.scheduled_for).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' +
                          (STATUS_STYLE[b.status] ?? 'bg-admin-bg text-admin-text-muted')
                        }
                      >
                        {b.status}
                        {b.payout_count === 0 && <span className="ml-1 text-red-600">· empty</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                      {b.payout_count}
                    </td>
                    <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text-muted">
                      {formatNaira(Number(b.total_gross ?? 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                      {formatNaira(Number(b.total_net ?? 0))}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/finance/batches/${b.id}`}
                        className="inline-flex items-center gap-1 font-body text-[12px] font-medium text-admin-green-text hover:text-admin-green"
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

        <div className="mt-10 rounded-2xl border border-admin-border bg-admin-card px-6 py-5 shadow-admin-sm">
          <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
            How this works
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
            Create batch → review payouts → release. Releasing flips all pending payouts
            to completed at the database level and records the audit trail. Actual money
            movement happens out-of-band for now — Ops uploads to your bank portal after
            release. Real Paystack Transfers integration comes next.
          </p>
        </div>
    </>
  );
}
