import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { ReleaseBatchButton } from './release-batch-button';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

const ITEM_STATUS_STYLE: Record<string, string> = {
  batched: 'bg-admin-amber-soft text-admin-amber-text',
  initiated: 'bg-admin-amber-soft text-admin-amber-text',
  completed: 'bg-admin-green-soft text-admin-green-text',
  failed: 'bg-red-500/12 text-red-600',
  reversed: 'bg-red-500/12 text-red-600',
  held: 'bg-red-500/12 text-red-600',
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
    <div className="pb-20">
        <AdminPageHeader
          backHref="/admin/finance/batches"
          backLabel="Batches"
          title={`Scheduled ${new Date(batch.scheduled_for).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`}
          subtitle={`Created ${new Date(batch.created_at).toLocaleString()}${
            batch.executed_at ? ` · Executed ${new Date(batch.executed_at).toLocaleString()}` : ''
          }`}
          actions={
            <span className="inline-flex items-center rounded-full bg-admin-bg px-2.5 py-1 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
              {batch.status}
            </span>
          }
        />

        {/* Totals */}
        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-admin-green/30 bg-admin-green-soft p-5 shadow-admin-sm">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              Paid to drivers
            </div>
            <div className="mt-2 font-display text-2xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
              {formatNaira(Number(batch.total_net ?? 0))}
            </div>
          </div>
          <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
              Recipients
            </div>
            <div className="mt-2 font-display text-2xl font-semibold leading-none tabular-nums tracking-tight text-admin-text">
              {distinctDrivers}
            </div>
            <div className="mt-1 font-body text-[11px] text-admin-text-muted">
              {batch.payout_count} payout{batch.payout_count === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Release action */}
        {canRelease && (
          <div className="mb-10 rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin">
            <AdminSectionLabel>Ready to release</AdminSectionLabel>
            <p className="mt-1 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
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
          <div className="mb-10 rounded-2xl border border-admin-green/30 bg-admin-green-soft px-6 py-5 shadow-admin-sm">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
              Released
            </div>
            <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
              This batch has been released. All payouts are marked completed. Complete the
              bank transfer separately if not already done.
            </p>
          </div>
        )}

        {/* Payouts table */}
        <div>
          <AdminSectionLabel>Payouts · {allPayouts.length}</AdminSectionLabel>
          {allPayouts.length === 0 ? (
            <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
              No payouts in this batch.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-admin-border shadow-admin-sm">
              <table className="w-full bg-admin-card">
                <thead className="border-b border-admin-border bg-admin-bg">
                  <tr>
                    <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                      Penalties
                    </th>
                    <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
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
                      className="border-b border-admin-border last:border-0 hover:bg-admin-bg"
                    >
                      <td className="px-4 py-3 font-body text-sm text-admin-text">
                        {driverNames[item.driver_id] ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' +
                            (ITEM_STATUS_STYLE[item.status] ?? 'bg-admin-bg text-admin-text-muted')
                          }
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text-muted">
                        {formatNaira(Number(item.penalties_deducted ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-admin-text">
                        {formatNaira(Number(item.net_amount))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-admin-text-muted">
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
  );
}
