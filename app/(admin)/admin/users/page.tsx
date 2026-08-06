import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { UserActions } from './user-actions';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  active: 'bg-admin-green-soft text-admin-green-text',
  suspended: 'bg-admin-amber-soft text-admin-amber-text',
  deleted: 'bg-red-500/12 text-red-600',
};
const ROLE_FILTERS = [
  ['', 'All roles'], ['driver', 'Drivers'], ['individual_customer', 'Customers'],
  ['corporate_admin', 'Corp admins'], ['admin_support', 'Support'], ['admin_finance', 'Finance'],
  ['admin_verifier', 'Verifiers'], ['admin_compliance', 'Compliance'], ['super_admin', 'Super admins'],
] as const;
const PAGE_SIZE = 50;

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
}

export default async function UsersAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const isSuper = user.roles.includes('super_admin');
  const canSupport = user.roles.includes('admin_support') || isSuper;
  if (!canSupport) redirect('/admin');

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const roleFilter = sp.role ?? '';
  const statusFilter = sp.status ?? '';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // If filtering by role, resolve matching user_ids first.
  let roleUserIds: string[] | null = null;
  if (roleFilter) {
    const { data: rr } = await A.from('user_roles').select('user_id').eq('role', roleFilter).is('revoked_at', null);
    roleUserIds = Array.from(new Set((rr ?? []).map((r: { user_id: string }) => r.user_id)));
    if (roleUserIds!.length === 0) roleUserIds = ['00000000-0000-0000-0000-000000000000'];
  }

  let query = A.from('users')
    .select('id, full_name, email, phone, status, created_at, deleted_at', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if (statusFilter) query = query.eq('status', statusFilter);
  if (roleUserIds) query = query.in('id', roleUserIds);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: usersData, count } = await query;
  const users = usersData ?? [];

  // roles for the visible users
  const ids = users.map((u: { id: string }) => u.id);
  let rolesByUser: Record<string, string[]> = {};
  if (ids.length) {
    const { data: rr } = await A.from('user_roles').select('user_id, role').in('user_id', ids).is('revoked_at', null);
    rolesByUser = (rr ?? []).reduce((acc: Record<string, string[]>, r: { user_id: string; role: string }) => {
      (acc[r.user_id] ??= []).push(r.role);
      return acc;
    }, {});
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(roleFilter ? { role: roleFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...over });
    return `/admin/users?${p.toString()}`;
  };

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="User management" subtitle="Search, grant roles, suspend, or remove users" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Matching users" value={total} />
        <MiniStat label="Page" value={`${page} / ${pages}`} />
      </div>

      {/* Filters */}
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Search name, email, phone</span>
          <input name="q" defaultValue={q} placeholder="e.g. Chidi, 0803…, @gmail" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20" />
        </label>
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Role</span>
          <select name="role" defaultValue={roleFilter} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {ROLE_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Status</span>
          <select name="status" defaultValue={statusFilter} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            <option value="">Any</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deleted">Deleted</option>
          </select>
        </label>
        <button className="rounded-xl bg-admin-navy px-5 py-2 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2">Search</button>
        {(q || roleFilter || statusFilter) && (
          <Link href="/admin/users" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Clear</Link>
        )}
      </form>

      {/* List */}
      {users.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No users match.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {users.map((u: { id: string; full_name: string | null; email: string | null; phone: string | null; status: string; created_at: string | null }) => (
            <div key={u.id} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-body text-sm font-semibold text-admin-text">{u.full_name ?? '—'}</span>
                  <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (STATUS_PILL[u.status] ?? 'bg-admin-bg text-admin-text-muted')}>{u.status}</span>
                </div>
                <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{u.email ?? '—'}{u.phone ? ` · ${u.phone}` : ''} · joined {fmtDate(u.created_at)}</div>
              </div>
              <div className="sm:w-[420px] sm:shrink-0">
                <UserActions userId={u.id} status={u.status} roles={rolesByUser[u.id] ?? []} canSuper={isSuper} isSelf={u.id === user.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between font-body text-[13px]">
          {page > 1 ? <Link href={qs({ page: String(page - 1) })} className="text-admin-text hover:text-admin-green-text">← Previous</Link> : <span />}
          <span className="text-admin-text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={qs({ page: String(page + 1) })} className="text-admin-text hover:text-admin-green-text">Next →</Link> : <span />}
        </div>
      )}
    </>
  );
}
