import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { AdminSidebar } from '@/components/avanti/admin/admin-sidebar';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG')}`;
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

const ROLE_STYLE: Record<string, string> = {
  individual_customer: 'border-admin-border text-admin-text-muted',
  corporate_member: 'border-admin-border text-admin-text-muted',
  corporate_admin: 'border-admin-border text-admin-text-muted',
  driver: 'border-admin-amber text-admin-amber-text',
  admin_verifier: 'border-admin-green text-admin-green-text',
  admin_support: 'border-admin-green text-admin-green-text',
  admin_finance: 'border-admin-green text-admin-green-text',
  admin_compliance: 'border-admin-green text-admin-green-text',
  super_admin: 'border-admin-navy text-admin-navy',
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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

  const { q } = await searchParams;
  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from('users')
    .select('id, full_name, email, phone, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q && q.trim()) {
    const term = q.trim().replace(/[%,]/g, '');
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }

  const { data: usersData } = await query;
  const users = usersData ?? [];
  const userIds = users.map((u: { id: string }) => u.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rolesData } =
    userIds.length > 0
      ? await (admin as any)
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds)
          .is('revoked_at', null)
      : { data: [] };

  const rolesByUser: Record<string, string[]> = {};
  for (const r of rolesData ?? []) {
    (rolesByUser[r.user_id] ??= []).push(r.role);
  }

  const driverUserIds = userIds.filter((id: string) => (rolesByUser[id] ?? []).includes('driver'));
  const customerUserIds = userIds.filter((id: string) =>
    (rolesByUser[id] ?? []).some((r) =>
      ['individual_customer', 'corporate_admin', 'corporate_member'].includes(r)
    )
  );

  const driverProfileByUser: Record<string, string> = {};
  const jobsByDriverId: Record<string, number> = {};
  const earningsByDriverId: Record<string, number> = {};

  if (driverUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id, completed_jobs')
      .in('user_id', driverUserIds);

    for (const p of profiles ?? []) {
      driverProfileByUser[p.user_id] = p.id;
      jobsByDriverId[p.id] = p.completed_jobs ?? 0;
    }

    const driverProfileIds = (profiles ?? []).map((p: { id: string }) => p.id);
    if (driverProfileIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: earnings } = await (admin as any)
        .from('v_driver_earnings_monthly')
        .select('driver_id, net_total')
        .in('driver_id', driverProfileIds);

      for (const e of earnings ?? []) {
        earningsByDriverId[e.driver_id] =
          (earningsByDriverId[e.driver_id] ?? 0) + Number(e.net_total ?? 0);
      }
    }
  }

  const statsByCustomer: Record<string, { count: number; total: number }> = {};
  if (customerUserIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: custEngagements } = await (admin as any)
      .from('v_engagements_customer')
      .select('customer_user_id, customer_price_total, status')
      .in('customer_user_id', customerUserIds);

    for (const e of custEngagements ?? []) {
      const bucket = (statsByCustomer[e.customer_user_id] ??= { count: 0, total: 0 });
      bucket.count += 1;
      if (e.status === 'completed') bucket.total += Number(e.customer_price_total ?? 0);
    }
  }

  return (
    <PageShell>
      <div className="flex bg-admin-bg" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          active="support"
          canVerify={canVerify}
          canPlacements={true}
          canSupport={true}
          canFinance={canFinance}
          canCompliance={canCompliance}
          isSuper={isSuper}
        />

        <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
          <p className="mb-6 font-body text-lg font-medium text-admin-text">Users</p>

          <form className="mb-6">
            <div className="relative max-w-md">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-muted"
                strokeWidth={1.75}
              />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search name, email, or phone…"
                className="w-full rounded-lg border border-admin-border bg-admin-card py-2 pl-10 pr-3 font-body text-sm text-admin-text placeholder:text-admin-text-muted focus:border-admin-navy focus:outline-none"
              />
            </div>
          </form>

          <div className="overflow-x-auto rounded-xl border border-admin-border">
            <table className="w-full bg-admin-card">
              <thead className="border-b border-admin-border bg-admin-bg">
                <tr>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Role
                  </th>
                  <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    As customer
                  </th>
                  <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    As driver
                  </th>
                  <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                    Joined
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(
                  (u: {
                    id: string;
                    full_name: string;
                    email: string | null;
                    phone: string | null;
                    created_at: string;
                  }) => {
                    const roles = rolesByUser[u.id] ?? [];
                    const custStats = statsByCustomer[u.id];
                    const driverProfileId = driverProfileByUser[u.id];

                    return (
                      <tr key={u.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                        <td className="px-4 py-3">
                          <div className="font-body text-sm text-admin-text">{u.full_name}</div>
                          <div className="font-body text-[12px] text-admin-text-muted">
                            {u.email ?? u.phone ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {roles.length === 0 ? (
                              <span className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                                No role
                              </span>
                            ) : (
                              roles.map((r) => (
                                <span
                                  key={r}
                                  className={
                                    'rounded-full border px-2 py-0.5 font-body text-[11px] tracking-wide ' +
                                    (ROLE_STYLE[r] ?? 'border-admin-border text-admin-text-muted')
                                  }
                                >
                                  {ROLE_LABEL[r] ?? r}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-body text-[12px] text-admin-text">
                          {custStats ? (
                            <>
                              {custStats.count} eng. · {formatNaira(custStats.total)}
                            </>
                          ) : (
                            <span className="text-admin-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-[12px] text-admin-text">
                          {driverProfileId ? (
                            <>
                              {jobsByDriverId[driverProfileId] ?? 0} jobs ·{' '}
                              {formatNaira(earningsByDriverId[driverProfileId] ?? 0)}
                            </>
                          ) : (
                            <span className="text-admin-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                          {new Date(u.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/support/${u.id}`}
                            className="inline-flex items-center gap-1 font-body text-[12px] font-medium text-admin-navy hover:text-admin-navy-2"
                          >
                            View
                            <ChevronRight className="h-3 w-3" strokeWidth={2} />
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="mt-4 rounded-xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted">
              No users found{q ? ` matching "${q}"` : ''}.
            </div>
          )}

          <p className="mt-4 font-body text-[12px] text-admin-text-muted">
            Showing {users.length} most recent{users.length === 200 ? ' (200 max — search to narrow)' : ''}
          </p>
        </div>
      </div>
    </PageShell>
  );
}
