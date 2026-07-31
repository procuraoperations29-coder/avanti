import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader } from '@/components/avanti/admin/page-header';
import { CreateStaffPanel, StaffRowActions } from './staff-actions';

const ROLE_LABEL: Record<string, string> = {
  admin_verifier: 'Verification',
  admin_support: 'Support',
  admin_finance: 'Finance',
  admin_compliance: 'Compliance',
  super_admin: 'Super admin',
};

const STAFF_ROLES = ['admin_verifier', 'admin_support', 'admin_finance', 'admin_compliance', 'super_admin'];

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default async function AdminStaffPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleRows } = await (admin as any)
    .from('user_roles')
    .select('id, user_id, role, requires_approval, approver_user_id, revoked_at, suspended, suspended_reason, created_at')
    .in('role', STAFF_ROLES)
    .order('created_at', { ascending: false });

  const rows = roleRows ?? [];
  const userIds = Array.from(new Set(rows.map((r: { user_id: string }) => r.user_id)));

  let usersById: Record<string, { full_name: string; email: string | null; phone: string | null }> = {};
  if (userIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usersData } = await (admin as any)
      .from('users')
      .select('id, full_name, email, phone')
      .in('id', userIds);
    usersById = Object.fromEntries(
      (usersData ?? []).map((u: { id: string; full_name: string; email: string | null; phone: string | null }) => [
        u.id,
        u,
      ])
    );
  }

  // Anyone currently active in any admin role is a valid approver choice.
  const approvers = rows
    .filter((r: { revoked_at: string | null }) => !r.revoked_at)
    .map((r: { user_id: string }) => r.user_id)
    .filter((id: string, i: number, arr: string[]) => arr.indexOf(id) === i)
    .map((id: string) => ({ id, full_name: usersById[id]?.full_name ?? 'Admin' }));

  return (
    <>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Admin"
        title="Staff"
        subtitle={`${rows.length} admin account${rows.length === 1 ? '' : 's'} across every department`}
      />

      <CreateStaffPanel approvers={approvers} />

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No staff accounts yet — you&apos;re the only admin.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border shadow-admin-sm">
          <table className="w-full bg-admin-card">
            <thead className="border-b border-admin-border bg-admin-bg">
              <tr>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Name</th>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Department</th>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Approver</th>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Status</th>
                <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Since</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: {
                id: string;
                user_id: string;
                role: string;
                requires_approval: boolean;
                approver_user_id: string | null;
                revoked_at: string | null;
                suspended: boolean;
                suspended_reason: string | null;
                created_at: string;
              }) => {
                const person = usersById[r.user_id];
                const approverName = r.approver_user_id ? usersById[r.approver_user_id]?.full_name : null;
                return (
                  <tr key={r.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/staff/${r.id}`}
                        className="font-body text-sm font-medium text-admin-text hover:text-admin-green-text hover:underline"
                      >
                        {person?.full_name ?? '—'}
                      </Link>
                      <div className="font-body text-[12px] text-admin-text-muted">
                        {person?.email ?? person?.phone ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-admin-text">
                      {ROLE_LABEL[r.role] ?? r.role}
                    </td>
                    <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                      {r.requires_approval ? (approverName ?? '—') : 'No approval needed'}
                    </td>
                    <td className="px-4 py-3">
                      {r.revoked_at ? (
                        <span className="inline-flex items-center rounded-full bg-admin-bg px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                          Deactivated
                        </span>
                      ) : r.suspended ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-admin-amber-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-amber-text"
                          title={r.suspended_reason ?? undefined}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-admin-amber" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-admin-green-soft px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide text-admin-green-text">
                          <span className="h-1.5 w-1.5 rounded-full bg-admin-green" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StaffRowActions
                        roleId={r.id}
                        isRevoked={!!r.revoked_at}
                        isSuspended={r.suspended}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
