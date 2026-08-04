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
  Activity,
  Wallet,
  TrendingUp,
  Route,
  Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: newTripCount } = await (admin as any)
    .from('trip_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: openCorpCount } = await (admin as any)
    .from('corporate_driver_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['new', 'reviewing']);

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
    // Total revenue captured this month, across EVERY stream — engagement
    // payments, out-of-state trips, corporate, and permanent placements. (The
    // old figure only counted completed engagements, so a paid booking or any
    // trip/corporate payment showed as ₦0.)
    const since = monthStart.toISOString();
    const [cap, trps, corp, plac] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('payments').select('gross_amount').eq('status', 'captured').gte('captured_at', since),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('trip_requests').select('offer_price').in('payment_status', ['paid', 'manual_paid']).gte('paid_at', since),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('corporate_invoices').select('amount').in('payment_status', ['paid', 'manual_paid']).gte('paid_at', since),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any).from('placement_invoices').select('amount').in('payment_status', ['paid', 'manual_paid']).gte('paid_at', since),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sumRows = (rows: any[] | null, key: string) => (rows ?? []).reduce((s: number, r: Record<string, unknown>) => s + Number(r[key] ?? 0), 0);
    revenueThisMonth =
      sumRows(cap.data, 'gross_amount') +
      sumRows(trps.data, 'offer_price') +
      sumRows(corp.data, 'amount') +
      sumRows(plac.data, 'amount');

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
      const [year = 0, month = 0] = key.split('-').map(Number);
      const label = new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'short' });
      return { label, revenue: v.revenue, payouts: v.payouts, net: v.revenue - v.payouts };
    });
  }

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  })();

  return (
    <>
          <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-admin-text">
                {greeting}, {user.email?.split('@')[0] ?? 'there'}
              </h1>
              <p className="mt-1 font-body text-[13px] text-admin-text-muted">
                Here&apos;s how Avanti is doing today.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-admin-border bg-admin-card text-admin-text-muted shadow-admin-sm transition-colors hover:text-admin-text"
                aria-label="Search"
              >
                <Search className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-admin-border bg-admin-card text-admin-text-muted shadow-admin-sm transition-colors hover:text-admin-text"
                aria-label="Notifications"
              >
                <Bell className="h-[17px] w-[17px]" strokeWidth={1.75} />
                {((queueCount ?? 0) > 0 || (newEnquiryCount ?? 0) > 0) && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-admin-amber ring-2 ring-admin-card" />
                )}
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-admin-navy font-body text-xs font-semibold text-white shadow-admin-sm">
                {(user.email ?? 'A A').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Operational KPIs — safe for every admin role */}
          <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Active drivers" value={String(driverCount ?? 0)} Icon={Users} />
            <KpiCard
              label="Engagements this month"
              value={String(engagementsThisMonth ?? 0)}
              Icon={Activity}
            />
            <KpiCard
              label="Verification queue"
              value={String(queueCount ?? 0)}
              Icon={ClipboardList}
              tone={(queueCount ?? 0) > 0 ? 'amber' : 'default'}
              href="/admin/verification"
            />
            <KpiCard
              label="New placement enquiries"
              value={String(newEnquiryCount ?? 0)}
              Icon={UserCheck}
              tone={(newEnquiryCount ?? 0) > 0 ? 'amber' : 'default'}
              href="/admin/placements"
            />
          </div>

          {canFinance && (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <KpiCard
                  label="Revenue this month"
                  value={formatNaira(revenueThisMonth)}
                  Icon={TrendingUp}
                  tone="green"
                  big
                />
                <KpiCard
                  label="Ready to batch"
                  value={formatNaira(readyToBatch)}
                  Icon={Wallet}
                  big
                  href="/admin/finance/batches"
                />
              </div>

              <div className="mb-5 rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-display text-[15px] font-semibold text-admin-text">
                      Revenue vs payouts
                    </div>
                    <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                      Last 6 months
                    </div>
                  </div>
                  <div className="flex gap-3.5 font-body text-[11px] font-medium text-admin-text-muted">
                    <Legend color="rgb(var(--admin-green))" label="Revenue" />
                    <Legend color="rgb(var(--admin-amber))" label="Payouts" />
                    <Legend color="rgb(var(--admin-text))" label="Net" />
                  </div>
                </div>
                <RevenueChart data={chartData} />
              </div>
            </>
          )}

          {/* Section navigation — same role-gating as before, restyled */}
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-admin-text-muted">
            Jump to
          </div>
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
            {canPlacements && (
              <ModuleCard
                href="/admin/trips"
                Icon={Route}
                title="Out-of-state trips"
                description={
                  (newTripCount ?? 0) > 0
                    ? `${newTripCount} new request${newTripCount === 1 ? '' : 's'}`
                    : 'Inter-city driver requests'
                }
                emphasis={(newTripCount ?? 0) > 0}
              />
            )}
            {canPlacements && (
              <ModuleCard
                href="/admin/corporate"
                Icon={Building2}
                title="Corporate staffing"
                description={
                  (openCorpCount ?? 0) > 0
                    ? `${openCorpCount} open request${openCorpCount === 1 ? '' : 's'}`
                    : 'Organisation driver requests'
                }
                emphasis={(openCorpCount ?? 0) > 0}
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
  Icon,
  tone = 'default',
  big,
  href,
}: {
  label: string;
  value: string;
  Icon: LucideIcon;
  tone?: 'default' | 'amber' | 'green';
  big?: boolean;
  href?: string;
}) {
  const chip = {
    default: 'bg-admin-bg text-admin-text-muted',
    amber: 'bg-admin-amber-soft text-admin-amber-text',
    green: 'bg-admin-green-soft text-admin-green-text',
  }[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span
          className={
            'flex h-9 w-9 items-center justify-center rounded-xl ' + chip
          }
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
        </span>
        {tone === 'amber' && (
          <span className="flex h-1.5 w-1.5 rounded-full bg-admin-amber" aria-hidden />
        )}
        {href && (
          <ArrowUpRight
            className="h-4 w-4 text-admin-text-muted opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={2}
          />
        )}
      </div>
      <p className="mt-4 font-body text-[12px] font-medium text-admin-text-muted">{label}</p>
      <p
        className={
          'mt-1 font-display font-semibold tabular-nums tracking-tight text-admin-text ' +
          (big ? 'text-[30px] leading-none' : 'text-[26px] leading-none')
        }
      >
        {value}
      </p>
    </>
  );

  const base =
    'group flex flex-col rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm transition-all';

  if (href) {
    return (
      <Link href={href} className={base + ' hover:-translate-y-0.5 hover:shadow-admin'}>
        {inner}
      </Link>
    );
  }
  return <div className={base}>{inner}</div>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
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
  Icon: LucideIcon;
  title: string;
  description: string;
  emphasis?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        'group flex items-center gap-4 rounded-2xl border p-4 shadow-admin-sm transition-all hover:-translate-y-0.5 hover:shadow-admin ' +
        (emphasis
          ? 'border-admin-amber/40 bg-admin-amber-soft'
          : 'border-admin-border bg-admin-card')
      }
    >
      <div
        className={
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ' +
          (emphasis ? 'bg-admin-amber text-white' : 'bg-admin-navy text-white')
        }
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <div className="font-body text-[14px] font-semibold text-admin-text">{title}</div>
        <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{description}</div>
      </div>
      <ArrowUpRight
        className="h-4 w-4 shrink-0 text-admin-text-muted transition-all group-hover:translate-x-0.5 group-hover:text-admin-text"
        strokeWidth={1.75}
      />
    </Link>
  );
}
