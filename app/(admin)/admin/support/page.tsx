import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';

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
  individual_customer: 'border-line-strong text-ink-muted',
  corporate_member: 'border-line-strong text-ink-muted',
  corporate_admin: 'border-line-strong text-ink-muted',
  driver: 'border-brass text-brass',
  admin_verifier: 'border-green text-green',
  admin_support: 'border-green text-green',
  admin_finance: 'border-green text-green',
  admin_compliance: 'border-green text-green',
  super_admin: 'border-oxblood text-oxblood',
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

  // Roles — this is what the old page was missing entirely: users and
  // user_roles are separate tables, so without this join every row looked
  // the same regardless of driver/customer/admin.
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

  // Driver stats: profile id + completed jobs (precomputed) + lifetime net earnings
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

  // Customer stats
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
      <div className="mx-auto max-w-5xl px-6 pt-8 pb-20">
        <SectionLabel>Admin · Support</SectionLabel>
        <h1 className="mb-8 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">Users.</em>
        </h1>

        <form className="mb-8">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.5}
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search name, email, or phone…"
              className="w-full border border-line-strong bg-paper py-2 pl-10 pr-3 font-body text-sm text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          </div>
        </form>

        <div className="overflow-x-auto border border-line">
          <table className="w-full">
            <thead className="border-b border-line bg-paper-2">
              <tr>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  Role
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  As customer
                </th>
                <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                  As driver
                </th>
                <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
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
                    <tr key={u.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                      <td className="px-4 py-3">
                        <div className="font-body text-sm text-ink">{u.full_name}</div>
                        <div className="font-mono text-xs text-ink-muted">
                          {u.email ?? u.phone ?? '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {roles.length === 0 ? (
                            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                              No role
                            </span>
                          ) : (
                            roles.map((r) => (
                              <span
                                key={r}
                                className={
                                  'border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ' +
                                  (ROLE_STYLE[r] ?? 'border-line-strong text-ink-muted')
                                }
                              >
                                {ROLE_LABEL[r] ?? r}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink">
                        {custStats ? (
                          <>
                            {custStats.count} eng. · {formatNaira(custStats.total)}
                          </>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-ink">
                        {driverProfileId ? (
                          <>
                            {jobsByDriverId[driverProfileId] ?? 0} jobs ·{' '}
                            {formatNaira(earningsByDriverId[driverProfileId] ?? 0)}
                          </>
                        ) : (
                          <span className="text-ink-faint">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {new Date(u.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/support/${u.id}`}
                          className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink hover:text-ink-2"
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
          <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
            No users found{q ? ` matching "${q}"` : ''}.
          </div>
        )}

        <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          Showing {users.length} most recent{users.length === 200 ? ' (200 max — search to narrow)' : ''}
        </p>
      </div>
    </PageShell>
  );
}
