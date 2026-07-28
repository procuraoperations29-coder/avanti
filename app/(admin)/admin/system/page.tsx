import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { AdminSidebar } from '@/components/avanti/admin/admin-sidebar';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';

/**
 * System overview — super admin only.
 *
 * NOTE: the role breakdown used to count a 'corporate_customer' role that
 * doesn't exist in the user_role enum (the real values are
 * 'corporate_admin' and 'corporate_member') — that card always showed 0.
 * Fixed here.
 */

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function SystemOverviewPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();

  const { count: totalUsers } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true });

  const { data: roleData } = await admin.from('user_roles').select('role');
  const roleCounts: Record<string, number> = {};
  (roleData ?? []).forEach((r) => {
    const role = r.role as string;
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  });

  const { data: driverProfiles } = await admin
    .from('driver_profiles')
    .select('verification_tier, verification_status');

  const drivers = driverProfiles ?? [];
  const tierCounts: Record<string, number> = { t0: 0, t1: 0, t2: 0, t3: 0, t4: 0 };
  const statusCounts: Record<string, number> = {};
  drivers.forEach((d) => {
    if (d.verification_tier) {
      tierCounts[d.verification_tier] = (tierCounts[d.verification_tier] ?? 0) + 1;
    }
    if (d.verification_status) {
      statusCounts[d.verification_status] = (statusCounts[d.verification_status] ?? 0) + 1;
    }
  });

  const { data: allEngagements } = await admin
    .from('engagements')
    .select('id, status, commission_total, driver_payout_total, completed_at');

  const engagements = allEngagements ?? [];

  // Same "already paid" exclusion used on the batches and finance pages —
  // without it, this figure counts every completed engagement's payout
  // amount regardless of whether it's actually been paid, so it never
  // decreases even after a batch is successfully released.
  const { data: existingPayoutsForSystem } = await admin
    .from('payouts')
    .select('engagement_id, status');
  const activeBatchedIdsForSystem = new Set(
    (existingPayoutsForSystem ?? [])
      .filter((p) => !['failed', 'reversed'].includes(p.status as string))
      .map((p) => p.engagement_id)
      .filter(Boolean)
  );
  const engagementStatusCounts: Record<string, number> = {};
  engagements.forEach((e) => {
    if (e.status) {
      engagementStatusCounts[e.status] = (engagementStatusCounts[e.status] ?? 0) + 1;
    }
  });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const revenueThisMonth = engagements
    .filter((e) => e.status === 'completed' && e.completed_at && new Date(e.completed_at) >= monthStart)
    .reduce((sum, e) => sum + Number(e.commission_total ?? 0), 0);

  const pendingPayoutTotal = engagements
    .filter((e) => e.status === 'completed' && !activeBatchedIdsForSystem.has(e.id))
    .reduce((sum, e) => sum + Number(e.driver_payout_total ?? 0), 0);

  return (
    <PageShell>
      <div className="flex bg-admin-bg" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          active="system"
          canVerify={true}
          canPlacements={true}
          canSupport={true}
          canFinance={true}
          canCompliance={true}
          isSuper={true}
        />

        <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
          <Link
            href="/admin"
            className="mb-4 inline-block font-body text-[13px] text-admin-text-muted hover:text-admin-text"
          >
            ← Admin
          </Link>
          <p className="mb-6 font-body text-lg font-medium text-admin-text">
            How Avanti is doing
          </p>

          <div className="mb-8 grid gap-3 md:grid-cols-4">
            <StatCard label="Users" value={totalUsers ?? 0} />
            <StatCard
              label="Drivers · verified"
              value={statusCounts['approved'] ?? 0}
              subtext={`of ${drivers.length} total`}
            />
            <StatCard label="Engagements" value={engagements.length} subtext="all time" />
            <StatCard
              label="Revenue this month"
              value={formatNaira(revenueThisMonth)}
              subtext="commission"
              tone="accent"
            />
          </div>

          <div className="mb-8">
            <p className="mb-3 font-body text-[13px] font-medium text-admin-text">Users by role</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {[
                { key: 'individual_customer', label: 'Individual customers' },
                { key: 'corporate_admin', label: 'Corporate admins' },
                { key: 'corporate_member', label: 'Corporate members' },
                { key: 'driver', label: 'Drivers' },
                { key: 'super_admin', label: 'Super admins' },
                { key: 'admin_verifier', label: 'Verifiers' },
                { key: 'admin_finance', label: 'Finance admins' },
                { key: 'admin_support', label: 'Support admins' },
                { key: 'admin_compliance', label: 'Compliance admins' },
              ].map((r) => (
                <div key={r.key} className="rounded-xl border border-admin-border bg-admin-card p-4">
                  <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    {r.label}
                  </div>
                  <div className="mt-1.5 font-body text-xl font-medium text-admin-text">
                    {roleCounts[r.key] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 font-body text-[13px] font-medium text-admin-text">Drivers by tier</p>
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
              {(['t0', 't1', 't2', 't3', 't4'] as const).map((tier) => (
                <div key={tier} className="rounded-xl border border-admin-border bg-admin-card p-4">
                  <div className="mb-2">
                    <TierBadge tier={tier as TierLevel} label="short" />
                  </div>
                  <div className="font-body text-xl font-medium text-admin-text">
                    {tierCounts[tier] ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-3 font-body text-[13px] font-medium text-admin-text">Engagements by status</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {Object.entries(engagementStatusCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="rounded-xl border border-admin-border bg-admin-card p-4">
                    <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                      {status.replace(/_/g, ' ')}
                    </div>
                    <div className="mt-1.5 font-body text-xl font-medium text-admin-text">{count}</div>
                  </div>
                ))}
              {Object.keys(engagementStatusCounts).length === 0 && (
                <div className="col-span-full rounded-xl border border-admin-border bg-admin-card px-6 py-8 text-center font-body text-sm text-admin-text-muted">
                  No engagements yet.
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 rounded-xl border border-admin-amber bg-admin-amber-soft p-6">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-amber-text">
              Pending payouts (total)
            </div>
            <div className="mt-2 font-body text-4xl font-medium leading-none text-admin-text">
              {formatNaira(pendingPayoutTotal)}
            </div>
            <div className="mt-2 max-w-xl font-body text-sm leading-relaxed text-admin-text">
              Total owed to drivers across all completed engagements. See Finance for what&apos;s
              actually ready to batch right now.
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-card px-6 py-5">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
              Coming
            </div>
            <p className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
              Time-series charts. User growth over time. Retention cohort analysis.
              Geographic distribution. Automated alerts on anomalies. User management
              controls (grant role, suspend, delete). Rate card management.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
