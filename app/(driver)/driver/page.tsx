import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ArrowRight, ChevronRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { Portrait } from '@/components/avanti/portrait';
import { DriverEngagementCard } from '@/components/driver/engagement-card';
import { statusLabel, type EngagementStatus } from '@/lib/engagement/driver-transitions';
import { SignOutButton } from '@/app/(customer)/sign-out-button';

/**
 * Driver home. Highlights whatever needs attention now — an active
 * engagement in flight, or the next upcoming one. Below that, recent
 * history and a link to the full list.
 *
 * Info-isolated: only driver_payout_total ever shown, never customer's
 * price or Avanti commission.
 */

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}

export default async function DriverHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // Load driver profile — need id + verification status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('id, verification_tier, verification_status')
    .eq('user_id', user.id)
    .single();

  // If not yet approved, route them back to onboarding/pending
  if (!profile || profile.verification_status !== 'approved') {
    redirect('/driver/onboarding/pending');
  }

  // Load active + upcoming engagements
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activeRows } = await (admin as any)
    .from('engagements')
    .select(
      'id, engagement_type, status, starts_at, driver_payout_total, currency, customer_user_id'
    )
    .eq('driver_id', profile.id)
    .in('status', ['activated', 'in_progress'])
    .order('starts_at', { ascending: true })
    .limit(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: upcomingRows } = await (admin as any)
    .from('engagements')
    .select(
      'id, engagement_type, status, starts_at, driver_payout_total, currency, customer_user_id'
    )
    .eq('driver_id', profile.id)
    .eq('status', 'confirmed')
    .order('starts_at', { ascending: true })
    .limit(10);

  // Batch-look-up customer names
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
      (customers ?? []).map((c: { id: string; full_name: string }) => [c.id, c.full_name])
    );
  }

  const active = (activeRows ?? [])[0];
  const upcoming = upcomingRows ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Portrait
            initials={initialsOf(user.email || user.phone || 'D')}
            size="md"
            tier={profile.verification_tier as TierLevel}
          />
          <div>
            <SectionLabel>Driver · {user.phone}</SectionLabel>
            <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
              Your work.
            </h1>
          </div>
        </div>
        <SignOutButton />
      </div>

      {/* Verification badge line */}
      <div className="mb-8 flex items-center gap-3">
        <TierBadge tier={profile.verification_tier as TierLevel} label="long" />
        <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
          Verified · bookable
        </span>
      </div>

      {/* Active engagement — big card */}
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
                  {new Date(active.starts_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="font-display text-2xl leading-tight text-ink">
                {namesById[active.customer_user_id] ?? 'Customer'}
              </div>
              <div className="mt-2 font-body text-sm text-ink-muted capitalize">
                {active.engagement_type.replace(/_/g, ' ')}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Your payout · {active.currency}
                </div>
                <div className="font-display text-xl text-ink">
                  {formatNaira(active.driver_payout_total ?? 0)}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2">
                Open engagement <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming */}
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
                driverPayoutTotal={e.driver_payout_total ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Link to full list */}
      <Link
        href="/driver/engagements"
        className="flex items-center justify-between border border-line bg-paper-2 px-4 py-3 font-body text-sm text-ink transition-colors hover:bg-paper-3"
      >
        View all engagements (including completed) <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
