import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

const ROLE_LABEL: Record<string, string> = {
  individual_customer: 'Customer',
  driver: 'Driver',
  corporate_admin: 'Corporate admin',
  corporate_member: 'Corporate member',
  admin_verifier: 'Admin · Verifier',
  admin_support: 'Admin · Support',
  admin_finance: 'Admin · Finance',
  admin_compliance: 'Admin · Compliance',
  super_admin: 'Super admin',
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/sign-in');
  if (!authUser.roles.includes('admin_support') && !authUser.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const isSuper = authUser.roles.includes('super_admin');
  const canVerify = authUser.roles.includes('admin_verifier') || isSuper;
  const canFinance = authUser.roles.includes('admin_finance') || isSuper;
  const canCompliance = authUser.roles.includes('admin_compliance') || isSuper;

  const { userId } = await params;
  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileUser } = await (admin as any)
    .from('users')
    .select('id, full_name, email, phone, status, created_at')
    .eq('id', userId)
    .single();

  if (!profileUser) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rolesData } = await (admin as any)
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .is('revoked_at', null);
  const roles: string[] = (rolesData ?? []).map((r: { role: string }) => r.role);
  const isDriver = roles.includes('driver');
  const isCustomer = roles.some((r) =>
    ['individual_customer', 'corporate_admin', 'corporate_member'].includes(r)
  );

  // ── Driver-side data ──
  let driverProfile: { id: string; verification_tier: TierLevel; verification_status: string } | null = null;
  let driverSummary: { completed_jobs: number | null; average_rating: number | null } | null = null;
  let monthlyEarnings: { month: string; gross_total: number | null; net_total: number | null; payouts_count: number | null }[] = [];
  let driverEngagements: {
    id: string;
    engagement_type: string | null;
    status: string | null;
    starts_at: string | null;
    customer_name: string | null;
    driver_payout_total: number | null;
  }[] = [];
  let driverPlacements: { id: string; monthly_salary: number; status: string; start_date: string; customer_user_id: string }[] = [];

  if (isDriver) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dp } = await (admin as any)
      .from('driver_profiles')
      .select('id, verification_tier, verification_status')
      .eq('user_id', userId)
      .single();
    driverProfile = dp ?? null;

    if (driverProfile) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: summary } = await (admin as any)
        .from('v_public_driver_summary')
        .select('completed_jobs, average_rating')
        .eq('driver_id', driverProfile.id)
        .maybeSingle();
      driverSummary = summary ?? null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: earnings } = await (admin as any)
        .from('v_driver_earnings_monthly')
        .select('month, gross_total, net_total, payouts_count')
        .eq('driver_id', driverProfile.id)
        .order('month', { ascending: false });
      monthlyEarnings = earnings ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: engs } = await (admin as any)
        .from('v_engagements_driver')
        .select('id, engagement_type, status, starts_at, customer_name, driver_payout_total')
        .eq('driver_id', driverProfile.id)
        .order('starts_at', { ascending: false })
        .limit(50);
      driverEngagements = engs ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: placements } = await (admin as any)
        .from('placements')
        .select('id, monthly_salary, status, start_date, customer_user_id')
        .eq('driver_id', driverProfile.id)
        .order('start_date', { ascending: false });
      driverPlacements = placements ?? [];
    }
  }

  // ── Customer-side data ──
  let customerEngagements: {
    id: string;
    engagement_type: string | null;
    status: string | null;
    starts_at: string | null;
    driver_name: string | null;
    customer_price_total: number | null;
  }[] = [];
  let customerPlacements: { id: string; monthly_salary: number; status: string; start_date: string; driver_id: string }[] = [];

  if (isCustomer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: engs } = await (admin as any)
      .from('v_engagements_customer')
      .select('id, engagement_type, status, starts_at, driver_name, customer_price_total')
      .eq('customer_user_id', userId)
      .order('starts_at', { ascending: false })
      .limit(50);
    customerEngagements = engs ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: placements } = await (admin as any)
      .from('placements')
      .select('id, monthly_salary, status, start_date, driver_id')
      .eq('customer_user_id', userId)
      .order('start_date', { ascending: false });
    customerPlacements = placements ?? [];
  }

  const customerTotal = customerEngagements
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + Number(e.customer_price_total ?? 0), 0);
  const driverTotalNet = monthlyEarnings.reduce((sum, m) => sum + Number(m.net_total ?? 0), 0);

  return (
    <>
          <Link
            href="/admin/support"
            className="mb-4 inline-flex items-center gap-1 font-body text-[13px] text-admin-text-muted hover:text-admin-text"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
            Users
          </Link>

          <p className="font-body text-[12px] uppercase tracking-wide text-admin-text-muted">
            {roles.map((r) => ROLE_LABEL[r] ?? r).join(' · ') || 'User'}
          </p>
          <p className="mt-1 font-body text-2xl font-medium text-admin-text">
            {profileUser.full_name}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 font-body text-[12px] text-admin-text-muted">
            {profileUser.email && <span>{profileUser.email}</span>}
            {profileUser.phone && <span>{profileUser.phone}</span>}
            <span>Joined {fmtDate(profileUser.created_at)}</span>
            <span className="uppercase">{profileUser.status}</span>
          </div>

          {isDriver && driverProfile && (
            <div className="mt-8 rounded-xl border border-admin-border bg-admin-card p-6">
              <div className="flex items-center justify-between">
                <p className="font-body text-[13px] font-medium text-admin-text">Driver</p>
                <TierBadge tier={(driverProfile.verification_tier as TierLevel) ?? 't1'} label="long" />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <StatCard label="Completed jobs" value={driverSummary?.completed_jobs ?? 0} />
                <StatCard label="Total earned (net)" value={formatNaira(driverTotalNet)} tone="success" />
                <StatCard
                  label="Rating"
                  value={driverSummary?.average_rating ? driverSummary.average_rating.toFixed(1) : '—'}
                />
              </div>

              {driverPlacements.length > 0 && (
                <div className="mt-6 border-t border-admin-border pt-4">
                  <div className="mb-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Permanent placements
                  </div>
                  {driverPlacements.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 font-body text-sm text-admin-text">
                      <span className="capitalize">
                        {p.status} · since {fmtDate(p.start_date)}
                      </span>
                      <span className="text-admin-text-muted">{formatNaira(p.monthly_salary)}/mo</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-admin-border pt-4">
                <div className="mb-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                  Recent engagements
                </div>
                {driverEngagements.length === 0 ? (
                  <p className="font-body text-sm text-admin-text-muted">No engagements yet.</p>
                ) : (
                  <div className="divide-y divide-admin-border">
                    {driverEngagements.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2.5 font-body text-sm">
                        <div>
                          <span className="text-admin-text">{e.customer_name ?? 'Customer'}</span>
                          <span className="ml-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                            {e.engagement_type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-body text-[12px]">
                          <span className="uppercase text-admin-text-muted">{e.status}</span>
                          <span className="text-admin-text">{formatNaira(Number(e.driver_payout_total ?? 0))}</span>
                          <span className="text-admin-text-muted">{fmtDate(e.starts_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {isCustomer && (
            <div className="mt-8 rounded-xl border border-admin-border bg-admin-card p-6">
              <p className="font-body text-[13px] font-medium text-admin-text">Customer</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <StatCard label="Engagements" value={customerEngagements.length} />
                <StatCard label="Total paid" value={formatNaira(customerTotal)} tone="success" />
              </div>

              {customerPlacements.length > 0 && (
                <div className="mt-6 border-t border-admin-border pt-4">
                  <div className="mb-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Permanent placements
                  </div>
                  {customerPlacements.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 font-body text-sm text-admin-text">
                      <span className="capitalize">
                        {p.status} · since {fmtDate(p.start_date)}
                      </span>
                      <span className="text-admin-text-muted">{formatNaira(p.monthly_salary)}/mo</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 border-t border-admin-border pt-4">
                <div className="mb-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                  Recent engagements
                </div>
                {customerEngagements.length === 0 ? (
                  <p className="font-body text-sm text-admin-text-muted">No engagements yet.</p>
                ) : (
                  <div className="divide-y divide-admin-border">
                    {customerEngagements.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-2.5 font-body text-sm">
                        <div>
                          <span className="text-admin-text">{e.driver_name ?? 'Driver'}</span>
                          <span className="ml-2 font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                            {e.engagement_type?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-body text-[12px]">
                          <span className="uppercase text-admin-text-muted">{e.status}</span>
                          <span className="text-admin-text">{formatNaira(Number(e.customer_price_total ?? 0))}</span>
                          <span className="text-admin-text-muted">{fmtDate(e.starts_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isDriver && !isCustomer && (
            <div className="mt-8 rounded-xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted">
              This user has no driver or customer role — likely staff/admin only.
            </div>
          )}
    </>
  );
}
