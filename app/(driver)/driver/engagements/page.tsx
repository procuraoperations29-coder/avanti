import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, CalendarDays } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { EmptyState } from '@/components/avanti/empty-state';
import { DriverEngagementCard } from '@/components/driver/engagement-card';
import type { EngagementStatus } from '@/lib/engagement/driver-transitions';

/**
 * All engagements — grouped by status band.
 *   Active (activated + in_progress)
 *   Upcoming (confirmed, future)
 *   Past (completed)
 */

export default async function DriverEngagementsListPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('driver')) redirect('/sign-in');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from('driver_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) redirect('/driver/onboarding/pending');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('engagements')
    .select(
      'id, engagement_type, status, starts_at, driver_payout_total, currency, customer_user_id'
    )
    .eq('driver_id', profile.id)
    .in('status', ['confirmed', 'activated', 'in_progress', 'completed'])
    .order('starts_at', { ascending: false })
    .limit(200);

  const items = rows ?? [];

  // Customer names in batch
  const uniqueIds = Array.from(
    new Set(items.map((e: { customer_user_id: string }) => e.customer_user_id))
  );
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

  const active = items.filter((e: { status: string }) =>
    ['activated', 'in_progress'].includes(e.status)
  );
  const upcoming = items.filter((e: { status: string }) => e.status === 'confirmed');
  const past = items.filter((e: { status: string }) => e.status === 'completed');

  const renderRow = (e: {
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
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 pb-20">
      <Link
        href="/driver"
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Home
      </Link>

      <SectionLabel>Engagements</SectionLabel>
      <h1 className="mb-8 mt-2 font-display text-4xl leading-tight text-ink">
        Everything you&apos;ve <em className="italic">been booked</em> for.
      </h1>

      {items.length === 0 ? (
        <EmptyState
          Icon={CalendarDays}
          title="No engagements yet"
          description="Once customers start booking you, they'll appear here."
        />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <SectionLabel>Active · {active.length}</SectionLabel>
                <span className="font-mono text-[10px] uppercase tracking-wider text-green">
                  In flight
                </span>
              </div>
              <div className="border border-ink bg-paper-2">{active.map(renderRow)}</div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <SectionLabel>Upcoming · {upcoming.length}</SectionLabel>
              <div className="mt-2 border border-line bg-paper-2">{upcoming.map(renderRow)}</div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <SectionLabel>Past · {past.length}</SectionLabel>
              <div className="mt-2 border border-line bg-paper-2">{past.map(renderRow)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
