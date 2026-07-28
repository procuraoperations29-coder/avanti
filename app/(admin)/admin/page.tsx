import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList,
  Users,
  DollarSign,
  ShieldAlert,
  LayoutGrid,
  UserCheck,
  ArrowUpRight,
  Search,
  Bell,
} from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { RevenueChart } from '@/components/avanti/admin/revenue-chart';

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

export default async function AdminHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const isAdmin =
    user.roles.includes('admin_verifier') ||
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('admin_compliance') ||
    user.roles.includes('super_admin');
  if (!isAdmin) redirect('/sign-in');

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;
  const canPlacements = canSupport || canVerify;

  const supabase = await createClient();
  const { count: queueCount } = await supabase
    .from('v_verification_queue')
    .select('driver_id', { count: 'exact', head: true });

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: newEnquiryCount } = await (admin as any)
    .from('placement_enquiries')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: driverCount } = await (admin as any)
    .from('driver_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'approved');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: engagementsThisMonth } = await (admin as any)
    .from('engagements')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString());

  // Finance figures are only fetched (and only ever rendered) for admins
  // who can see them — same invariant as the rest of the app: customer
  // price and driver payout numbers don't leak across roles that don't
  // need them.
  let revenueThisMonth = 0;
  let readyToBatch = 0;
  let chartData: { label: string; revenue: number; payouts: number; net: number }[] = [];

  if (canFinance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: monthEngagements } = await (admin as any)
      .from('engagements')
      .select('customer_price_total')
      .eq('status', 'completed')
      .gte('completed_at', monthStart.toISOString());
    revenueThisMonth = (monthEngagements ?? []).reduce(
      (sum: number, e: { customer_price_total: number | null }) =>
        sum + Number(e.customer_price_total ?? 0),
      0
    );

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
    const unbatched = (unpaid ?? []).filter((e: { id: string }) => !activeBatchedIds.has(e.id));
    const unbatchedDriverIds = Array.from(
      new Set(unbatched.map((e: { driver_id: string }) => e.driver_id))
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
    readyToBatch = unbatched
      .filter((e: { driver_id: string }) => driversWithPayoutMethod.has(e.driver_id))
      .reduce(
        (sum: number, e: { driver_payout_total: number | null }) =>
          sum + Number(e.driver_payout_total ?? 0),
        0
      );

    // 6-month trend, bucketed by the month each engagement completed in.
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: trendRows } = await (admin as any)
      .from('engagements')
      .select('completed_at, customer_price_total, driver_payout_total')
      .eq('status', 'completed')
      .gte('completed_at', sixMonthsAgo.toISOString());

    const buckets = new Map<string, { revenue: number; payouts: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { revenue: 0, payouts: 0 });
    }
    for (const row of trendRows ?? []) {
      const d = new Date(row.completed_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.revenue += Number(row.customer_price_total ?? 0);
      bucket.payouts += Number(row.driver_payout_total ?? 0) * 0.95;
    }
    chartData = Array.from(buckets.entries()).map(([key, v]) => {
      const [year, month] = key.split('-').map(Number);
      const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short' });
      return { label, revenue: v.revenue, payouts: v.payouts, net: v.revenue - v.payouts };
    });
  }

  return (
    <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="font-body text-lg font-medium text-admin-text">
                Good morning, {user.email?.split('@')[0] ?? 'there'}
              </p>
              <p className="mt-0.5 font-body text-[13px] text-admin-text-muted">
                Here&apos;s how Avanti is doing today
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Search className="h-[18px] w-[18px] text-admin-text-muted" strokeWidth={1.75} />
              <Bell className="h-[18px] w-[18px] text-admin-text-muted" strokeWidth={1.75} />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-soft font-body text-xs font-medium text-admin-green-text">
                {(user.email ?? 'A A').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Operational KPIs — safe for every admin role */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Active drivers" value={String(driverCount ?? 0)} />
            <KpiCard label="Engagements this month" value={String(engagementsThisMonth ?? 0)} />
            <KpiCard
              label="Verification queue"
              value={String(queueCount ?? 0)}
              accent={(queueCount ?? 0) > 0}
            />
            <KpiCard
              label="New placement enquiries"
              value={String(newEnquiryCount ?? 0)}
              accent={(newEnquiryCount ?? 0) > 0}
            />
          </div>

          {canFinance && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Gross revenue this month" value={formatNaira(revenueThisMonth)} />
                <KpiCard label="Ready to batch" value={formatNaira(readyToBatch)} />
              </div>

              <div className="mb-5 rounded-xl border border-admin-border bg-admin-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-body text-[13px] font-medium text-admin-text">
                    Revenue vs payouts
                  </span>
                  <div className="flex gap-3.5 font-body text-[11px] text-admin-text-muted">
                    <Legend color="var(--admin-green)" label="Revenue" />
                    <Legend color="var(--admin-amber)" label="Payouts" />
                    <Legend color="var(--admin-navy)" label="Net" />
                  </div>
                </div>
                <RevenueChart data={chartData} />
              </div>
            </>
          )}

          {/* Section navigation — same role-gating as before, restyled */}
          <div className="grid gap-3 sm:grid-cols-2">
            {canVerify && (
              <ModuleCard
                href="/admin/verification"
                Icon={ClipboardList}
                title="Verification queue"
                description={`${queueCount ?? 0} pending`}
                emphasis={(queueCount ?? 0) > 0}
              />
            )}
            {canPlacements && (
              <ModuleCard
                href="/admin/placements"
                Icon={UserCheck}
                title="Placements"
                description={
                  (newEnquiryCount ?? 0) > 0
                    ? `${newEnquiryCount} new enquiries`
                    : 'Permanent driver enquiries'
                }
                emphasis={(newEnquiryCount ?? 0) > 0}
              />
            )}
            {canSupport && (
              <ModuleCard
                href="/admin/support"
                Icon={Users}
                title="Support"
                description="Engagements, users, escalations"
              />
            )}
            {canFinance && (
              <ModuleCard
                href="/admin/finance"
                Icon={DollarSign}
                title="Finance"
                description="Revenue, payouts, batches"
              />
            )}
            {canCompliance && (
              <ModuleCard
                href="/admin/compliance"
                Icon={ShieldAlert}
                title="Compliance"
                description="Audit log, decisions, disputes"
              />
            )}
            {isSuper && (
              <ModuleCard
                href="/admin/system"
                Icon={LayoutGrid}
                title="System overview"
                description="Users, tiers, engagements, revenue at a glance"
              />
            )}
          </div>
    </>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-card p-3.5">
      <p className="font-body text-[12px] text-admin-text-muted">{label}</p>
      <p
        className={
          'mt-1.5 font-body text-[22px] font-medium ' +
          (accent ? 'text-admin-amber-text' : 'text-admin-text')
        }
      >
        {value}
      </p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function ModuleCard({
  href,
  Icon,
  title,
  description,
  emphasis,
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-admin-bg ' +
        (emphasis ? 'border-admin-amber bg-admin-amber-soft' : 'border-admin-border bg-admin-card')
      }
    >
      <div
        className={
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' +
          (emphasis ? 'bg-white' : 'bg-admin-bg')
        }
      >
        <Icon className="h-4 w-4 text-admin-navy" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <div className="font-body text-[14px] font-medium text-admin-text">{title}</div>
        <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{description}</div>
      </div>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-admin-text-muted opacity-0 transition-opacity group-hover:opacity-100"
        strokeWidth={1.75}
      />
    </Link>
  );
}
