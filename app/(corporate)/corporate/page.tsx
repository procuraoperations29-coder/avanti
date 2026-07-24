import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { SectionLabel } from '@/components/avanti/section-label';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { EmptyState } from '@/components/avanti/empty-state';

function formatNaira(n: number): string {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

const ACTIVE_STATUSES = ['accepted', 'confirmed', 'active'];

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending_verification: {
    title: 'Organisation verification pending.',
    body: "A member of our team is reviewing your organisation's registration details. This usually takes a business day. You'll receive an email at your billing address when verification is complete.",
  },
  suspended: {
    title: 'Organisation account suspended.',
    body: 'Contact support to resolve this before you can book or manage drivers.',
  },
  closed: {
    title: 'Organisation account closed.',
    body: 'This account is no longer active. Contact support if you believe this is a mistake.',
  },
};

export default async function CorporateHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const orgId = user.activeOrganizationId;
  if (!orgId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <SectionLabel>Signed in · corporate</SectionLabel>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
          No organisation on your account yet.
        </h1>
        <p className="mt-4 font-body text-ink-muted">
          Contact support if you believe this is a mistake.
        </p>
      </div>
    );
  }

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, status')
    .eq('id', orgId)
    .single();

  if (!org) redirect('/sign-in');

  if (org.status !== 'active') {
    const copy = STATUS_COPY[org.status as string] ?? {
      title: 'Organisation status update.',
      body: 'Contact support for details on your organisation account.',
    };
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 pb-20">
        <SectionLabel>Signed in · corporate</SectionLabel>
        <h1 className="mt-3 font-display text-4xl leading-tight text-ink">
          <em className="italic">{copy.title}</em>
        </h1>
        <div className="mt-6 rounded-lg border border-brass bg-brass-soft p-5">
          <SectionLabel>What&apos;s next</SectionLabel>
          <p className="mt-3 font-body text-ink">{copy.body}</p>
        </div>
      </div>
    );
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ count: teamSize }, { data: engagementRows }, { data: monthEngagements }] =
    await Promise.all([
      admin
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .is('revoked_at', null)
        .in('role', ['corporate_admin', 'corporate_member']),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from('engagements')
        .select('id, engagement_type, status, starts_at, customer_price_total, driver_id')
        .eq('customer_organization_id', orgId)
        .order('starts_at', { ascending: false })
        .limit(10),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (admin as any)
        .from('engagements')
        .select('customer_price_total')
        .eq('customer_organization_id', orgId)
        .eq('status', 'completed')
        .gte('completed_at', monthStart.toISOString()),
    ]);

  const engagements: {
    id: string;
    engagement_type: string | null;
    status: string | null;
    starts_at: string | null;
    customer_price_total: number | null;
    driver_id: string | null;
  }[] = engagementRows ?? [];

  const activeCount = engagements.filter((e) => ACTIVE_STATUSES.includes(e.status ?? '')).length;
  const spendThisMonth = (monthEngagements ?? []).reduce(
    (sum: number, e: { customer_price_total: number | null }) =>
      sum + Number(e.customer_price_total ?? 0),
    0
  );

  const driverIds = Array.from(
    new Set(engagements.map((e) => e.driver_id).filter(Boolean))
  ) as string[];

  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id')
      .in('id', driverIds);
    const userIds = (profiles ?? [])
      .map((p: { user_id: string | null }) => p.user_id)
      .filter(Boolean) as string[];
    if (userIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: users } = await (admin as any)
        .from('users')
        .select('id, full_name')
        .in('id', userIds);
      const nameByUserId = Object.fromEntries(
        (users ?? []).map((u: { id: string; full_name: string | null }) => [
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

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 pb-20">
      <SectionLabel>Signed in · {org.name}</SectionLabel>
      <h1 className="mt-2 font-display text-4xl leading-tight text-ink">What today?</h1>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <StatCard label="Active engagements" value={activeCount} />
        <StatCard label="Spend this month" value={formatNaira(spendThisMonth)} tone="accent" />
        <StatCard label="Team size" value={teamSize ?? 0} />
      </div>

      <div className="mt-10">
        <SectionLabel>Recent engagements</SectionLabel>
        {engagements.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No engagements yet"
              description="Once your team books a driver, it'll show up here."
            />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-line">
            <ul>
              {engagements.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0"
                >
                  <div>
                    <div className="font-body text-sm text-ink">
                      {driverNames[e.driver_id ?? ''] ?? '—'}
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
                      {e.engagement_type?.replace(/_/g, ' ')} · {e.status}
                    </div>
                  </div>
                  <div className="text-right font-body text-sm text-ink-muted">
                    {e.starts_at
                      ? new Date(e.starts_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : '—'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
