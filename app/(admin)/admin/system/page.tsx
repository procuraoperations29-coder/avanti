import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';

/**
 * System overview — super admin only.
 *
 * Platform-wide metrics: users by role, drivers by tier, engagements
 * by status, revenue and pending payout totals. This is the "how is
 * Avanti doing" dashboard.
 */

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function SystemOverviewPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();

  // Users
  const { count: totalUsers } = await admin
    .from('users')
    .select('id', { count: 'exact', head: true });

  const { data: roleData } = await admin.from('user_roles').select('role');
  const roleCounts: Record<string, number> = {};
  (roleData ?? []).forEach((r) => {
    const role = r.role as string;
    roleCounts[role] = (roleCounts[role] ?? 0) + 1;
  });

  // Drivers by tier + status
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

  // Engagements by status
  const { data: allEngagements } = await admin
    .from('engagements')
    .select('status, commission_total, driver_payout_total, completed_at');

  const engagements = allEngagements ?? [];
  const engagementStatusCounts: Record<string, number> = {};
  engagements.forEach((e) => {
    if (e.status) {
      engagementStatusCounts[e.status] = (engagementStatusCounts[e.status] ?? 0) + 1;
    }
  });

  // Revenue this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const revenueThisMonth = engagements
    .filter((e) => e.status === 'completed' && e.completed_at && new Date(e.completed_at) >= monthStart)
    .reduce((sum, e) => sum + Number(e.commission_total ?? 0), 0);

  const pendingPayoutTotal = engagements
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + Number(e.driver_payout_total ?? 0), 0);

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

        <SectionLabel>System</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">How Avanti is doing.</em>
        </h1>

        {/* Top-line metrics */}
        <div className="mb-12 grid gap-6 md:grid-cols-4">
          <MetricCard label="Users" value={totalUsers ?? 0} />
          <MetricCard
            label="Drivers · verified"
            value={statusCounts['approved'] ?? 0}
            subtext={`of ${drivers.length} total`}
          />
          <MetricCard label="Engagements" value={engagements.length} subtext="all time" />
          <MetricCard
            label="Revenue this month"
            value={formatNaira(revenueThisMonth)}
            subtext="commission"
            emphasise
          />
        </div>

        {/* Users by role */}
        <div className="mb-10">
          <SectionLabel>Users by role</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { key: 'individual_customer', label: 'Individual customers' },
              { key: 'corporate_customer', label: 'Corporate customers' },
              { key: 'driver', label: 'Drivers' },
              { key: 'super_admin', label: 'Super admins' },
              { key: 'admin_verifier', label: 'Verifiers' },
              { key: 'admin_finance', label: 'Finance admins' },
              { key: 'admin_support', label: 'Support admins' },
              { key: 'admin_compliance', label: 'Compliance admins' },
            ].map((r) => (
              <div key={r.key} className="border border-line bg-paper-2 p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  {r.label}
                </div>
                <div className="mt-2 font-display text-2xl leading-none text-ink">
                  {roleCounts[r.key] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drivers by tier */}
        <div className="mb-10">
          <SectionLabel>Drivers by tier</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 md:grid-cols-5">
            {(['t0', 't1', 't2', 't3', 't4'] as const).map((tier) => (
              <div key={tier} className="border border-line bg-paper-2 p-4">
                <div className="mb-2">
                  <TierBadge tier={tier as TierLevel} label="short" />
                </div>
                <div className="font-display text-2xl leading-none text-ink">
                  {tierCounts[tier] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagements by status */}
        <div className="mb-10">
          <SectionLabel>Engagements by status</SectionLabel>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {Object.entries(engagementStatusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <div key={status} className="border border-line bg-paper-2 p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {status.replace(/_/g, ' ')}
                  </div>
                  <div className="mt-2 font-display text-2xl leading-none text-ink">
                    {count}
                  </div>
                </div>
              ))}
            {Object.keys(engagementStatusCounts).length === 0 && (
              <div className="col-span-full border border-line bg-paper-2 px-6 py-8 text-center font-body text-sm text-ink-muted">
                No engagements yet.
              </div>
            )}
          </div>
        </div>

        {/* Pending payouts */}
        <div className="mb-10 border-2 border-brass bg-brass-soft p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Pending payouts (total)
          </div>
          <div className="mt-3 font-display text-5xl leading-none text-ink">
            {formatNaira(pendingPayoutTotal)}
          </div>
          <div className="mt-3 max-w-xl font-body text-sm leading-relaxed text-ink">
            Total owed to drivers across all completed engagements. Slice 8 (payouts)
            will batch these weekly and mark them as paid.
          </div>
        </div>

        <div className="border-l-2 border-ink bg-paper-2 px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
            Coming
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Time-series charts. User growth over time. Retention cohort analysis.
            Geographic distribution. Automated alerts on anomalies. User management
            controls (grant role, suspend, delete). Rate card management.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  emphasise,
}: {
  label: string;
  value: number | string;
  subtext?: string;
  emphasise?: boolean;
}) {
  return (
    <div
      className={
        emphasise
          ? 'border-2 border-brass bg-brass-soft p-6'
          : 'border border-line bg-paper-2 p-6'
      }
    >
      <div
        className={
          emphasise
            ? 'font-mono text-[10px] uppercase tracking-[0.2em] text-brass'
            : 'font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted'
        }
      >
        {label}
      </div>
      <div className="mt-3 font-display text-3xl leading-none text-ink">{value}</div>
      {subtext && (
        <div className="mt-3 font-mono text-xs text-ink-muted">{subtext}</div>
      )}
    </div>
  );
}
