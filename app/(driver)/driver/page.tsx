import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ArrowRight, ChevronRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { Portrait } from '@/components/avanti/portrait';
import { DriverEngagementCard } from '@/components/driver/engagement-card';
import { AvailabilityToggle } from '@/components/driver/availability-toggle';
import { statusLabel, type EngagementStatus } from '@/lib/engagement/driver-transitions';
import { monthlySalaryForTier } from '@/lib/permanent/salary';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function DriverHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('id, verification_tier, verification_status, available_on_demand, available_permanent')
    .eq('user_id', user.id)
    .single();

  if (!profile || profile.verification_status !== 'approved') {
    redirect('/driver/onboarding/pending');
  }

  const tier = profile.verification_tier as TierLevel;
  const monthlySalary = monthlySalaryForTier(tier);

  // Payouts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: payoutsData } = await (admin as any)
    .from('payouts')
    .select('status, net_amount, gross_payout, tax_withheld_total, completed_at, engagement_id')
    .eq('driver_id', profile.id);

  const payouts = payoutsData ?? [];
  const paidPayouts = payouts.filter((p: { status: string }) => p.status === 'completed');
  const pendingPayouts = payouts.filter((p: { status: string }) =>
    ['batched', 'initiated'].includes(p.status)
  );
  const activePayoutEngagementIds = new Set(
    payouts
      .filter((p: { status: string }) => !['failed', 'reversed'].includes(p.status))
      .map((p: { engagement_id: string | null }) => p.engagement_id)
      .filter(Boolean)
  );

  const totalPaidNet = paidPayouts.reduce(
    (sum: number, p: { net_amount: number }) => sum + Number(p.net_amount ?? 0),
    0
  );
  const pendingBatchedNet = pendingPayouts.reduce(
    (sum: number, p: { net_amount: number }) => sum + Number(p.net_amount ?? 0),
    0
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: completedData } = await (admin as any)
    .from('engagements')
    .select('id, driver_payout_total, completed_at')
    .eq('driver_id', profile.id)
    .eq('status', 'completed');

  const completed = completedData ?? [];
  const unbatched = completed.filter(
    (e: { id: string }) => !activePayoutEngagementIds.has(e.id)
  );
  const unbatchedNet = unbatched.reduce(
    (sum: number, e: { driver_payout_total: number | null }) =>
      sum + Number(e.driver_payout_total ?? 0),
    0
  ) * 0.95;
  const totalPendingNet = pendingBatchedNet + unbatchedNet;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonthPaidNet = paidPayouts
    .filter(
      (p: { completed_at: string | null }) =>
        p.completed_at && new Date(p.completed_at) >= monthStart
    )
    .reduce((sum: number, p: { net_amount: number }) => sum + Number(p.net_amount ?? 0), 0);

  // Active + upcoming engagements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeRows } = await (admin as any)
    .from('engagements')
    .select('id, engagement_type, status, starts_at, driver_payout_total, currency, customer_user_id')
    .eq('driver_id', profile.id)
    .eq('status', 'active')
    .order('starts_at', { ascending: true })
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upcomingRows } = await (admin as any)
    .from('engagements')
    .select('id, engagement_type, status, starts_at, driver_payout_total, currency, customer_user_id')
    .eq('driver_id', profile.id)
    .eq('status', 'confirmed')
    .order('starts_at', { ascending: true })
    .limit(10);

  const allIds = [
    ...(activeRows ?? []),
    ...(upcomingRows ?? []),
  ].map((e: { customer_user_id: string }) => e.customer_user_id);
  const uniqueIds = Array.from(new Set(allIds));

  let namesById: Record<string, string> = {};
  if (uniqueIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customers } = await (admin as any)
      .from('users')
      .select('id, full_name')
      .in('id', uniqueIds);
    namesById = Object.fromEntries(
      (customers ?? []).map((c: { id: string; full_name: string | null }) => [
        c.id,
        c.full_name ?? 'Customer',
      ])
    );
  }

  const active = (activeRows ?? [])[0];
  const upcoming = upcomingRows ?? [];

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
        <div className="mb-10 flex items-center gap-4">
          <Portrait
            initials={initialsOf(user.email || user.phone || 'D')}
            size="md"
            tier={tier}
          />
          <div>
            <SectionLabel>Driver · {user.phone}</SectionLabel>
            <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
              Your work.
            </h1>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <TierBadge tier={tier} label="long" />
          <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
            Verified · bookable
          </span>
        </div>

        {/* Availability toggle */}
        <div className="mb-10">
          <AvailabilityToggle
            initialOnDemand={profile.available_on_demand}
            initialPermanent={profile.available_permanent}
            monthlySalary={monthlySalary}
          />
        </div>

        {/* Earnings */}
        <div className="mb-10 border border-line bg-paper-2 p-6">
          <div className="flex items-baseline justify-between">
            <SectionLabel>Earnings</SectionLabel>
            <Link
              href="/driver/earnings"
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              Full history →
            </Link>
          </div>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
                Paid to date
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-ink">
                {formatNaira(totalPaidNet)}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">
                {paidPayouts.length} payout{paidPayouts.length === 1 ? '' : 's'}
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                This month paid
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-ink">
                {formatNaira(thisMonthPaidNet)}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">Net after tax</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
                Pending
              </div>
              <div className="mt-2 font-display text-3xl leading-none text-brass">
                {formatNaira(totalPendingNet)}
              </div>
              <div className="mt-2 font-mono text-xs text-ink-muted">Next batch: Friday</div>
            </div>
          </div>
          <div className="mt-6 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
            Amounts shown are net (after 5% withholding tax)
          </div>
        </div>

        {active && (
          <div className="mb-8">
            <SectionLabel>Now</SectionLabel>
            <div className="mt-3">
              <Link
                href={`/driver/engagements/${active.id}`}
                className="block border-2 border-ink bg-paper-2 p-6 transition-colors hover:bg-paper-3"
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <div className="font-mono text-xs uppercase tracking-wider text-green">
                    {statusLabel(active.status as EngagementStatus)}
                  </div>
                  <div className="font-mono text-xs text-ink-muted">
                    {new Date(active.starts_at!).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="font-display text-2xl leading-tight text-ink">
                  {namesById[active.customer_user_id] ?? 'Customer'}
                </div>
                <div className="mt-2 font-body text-sm text-ink-muted capitalize">
                  {active.engagement_type!.replace(/_/g, ' ')}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Your payout · {active.currency}
                  </div>
                  <div className="font-display text-xl text-ink">
                    {formatNaira(Number(active.driver_payout_total ?? 0))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink">
                  Open engagement <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="mb-3 flex items-baseline justify-between">
            <SectionLabel>Upcoming</SectionLabel>
            <Link
              href="/driver/engagements"
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              All →
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState
              Icon={CalendarDays}
              title={active ? 'No other bookings' : 'Nothing scheduled'}
              description={
                active
                  ? 'You have no upcoming engagements after the current one.'
                  : "New bookings will appear here as customers reserve your time."
              }
            />
          ) : (
            <div className="border border-line bg-paper-2">
              {upcoming.map((e: {
                id: string;
                engagement_type: string;
                status: string;
                starts_at: string;
                customer_user_id: string;
                driver_payout_total: number | null;
                currency: string;
              }) => (
                <DriverEngagementCard
                  key={e.id}
                  engagementId={e.id}
                  customerName={namesById[e.customer_user_id] ?? 'Customer'}
                  engagementType={e.engagement_type}
                  status={e.status as EngagementStatus}
                  startsAt={e.starts_at}
                  currency={e.currency}
                  driverPayoutTotal={Number(e.driver_payout_total ?? 0)}
                />
              ))}
            </div>
          )}
        </div>

        <Link
          href="/driver/engagements"
          className="flex items-center justify-between border border-line bg-paper-2 px-4 py-3 font-body text-sm text-ink transition-colors hover:bg-paper-3"
        >
          View all engagements (including completed) <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </PageShell>
  );
}
