import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { AdminEngagementActions } from './engagement-actions';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-admin-bg text-admin-text-muted',
  requested: 'bg-admin-amber-soft text-admin-amber-text',
  accepted: 'bg-admin-amber-soft text-admin-amber-text',
  confirmed: 'bg-admin-green-soft text-admin-green-text',
  active: 'bg-admin-green-soft text-admin-green-text',
  completed: 'bg-admin-bg text-admin-text-muted',
  cancelled: 'bg-red-500/12 text-red-600',
  refunded: 'bg-red-500/12 text-red-600',
  disputed: 'bg-red-500/12 text-red-600',
};
const STATUS_FILTERS = ['', 'draft', 'requested', 'accepted', 'confirmed', 'active', 'completed', 'cancelled', 'disputed'];
const PAGE_SIZE = 40;

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
}
function naira(n: number | null): string { return n == null ? '—' : `₦${Number(n).toLocaleString('en-NG')}`; }

export default async function AdminEngagementsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canView = user.roles.includes('admin_support') || user.roles.includes('admin_finance') || user.roles.includes('super_admin');
  if (!canView) redirect('/admin');

  const sp = await searchParams;
  const status = sp.status ?? '';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  let query = A.from('engagements')
    .select('id, customer_user_id, driver_id, engagement_type, status, starts_at, currency, customer_price_total, cancellation_fee, refund_amount, contract_id', { count: 'exact' })
    .order('starts_at', { ascending: false });
  if (status) query = query.eq('status', status);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: rows, count } = await query;
  const list = (rows ?? []) as Array<Record<string, unknown>>;

  // names
  const custIds = Array.from(new Set(list.map((e) => e.customer_user_id).filter(Boolean))) as string[];
  const drvIds = Array.from(new Set(list.map((e) => e.driver_id).filter(Boolean))) as string[];
  const { data: custs } = custIds.length ? await A.from('users').select('id, full_name').in('id', custIds) : { data: [] };
  const custName: Record<string, string> = Object.fromEntries((custs ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? '—']));
  const { data: dps } = drvIds.length ? await A.from('driver_profiles').select('id, user_id').in('id', drvIds) : { data: [] };
  const dpUser: Record<string, string> = Object.fromEntries((dps ?? []).map((d: { id: string; user_id: string }) => [d.id, d.user_id]));
  const dUserIds = Object.values(dpUser);
  const { data: dus } = dUserIds.length ? await A.from('users').select('id, full_name').in('id', dUserIds) : { data: [] };
  const uName: Record<string, string> = Object.fromEntries((dus ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
  const driverName = (driverId: string | null) => (driverId && dpUser[driverId] ? uName[dpUser[driverId]] ?? 'Driver' : '—');

  const [{ count: activeCount }, { count: cancelledCount }] = await Promise.all([
    A.from('engagements').select('id', { count: 'exact', head: true }).in('status', ['confirmed', 'active']),
    A.from('engagements').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Engagements" subtitle="On-demand bookings — view, cancel, and refund" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Total" value={total} />
        <MiniStat label="Active / confirmed" value={activeCount ?? 0} />
        <MiniStat label="Cancelled" value={cancelledCount ?? 0} />
        <MiniStat label="This page" value={list.length} />
      </div>

      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Status</span>
          <select name="status" defaultValue={status} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'Any'}</option>)}
          </select>
        </label>
        <button className="rounded-xl bg-admin-navy px-5 py-2 font-body text-sm font-medium text-white shadow-admin-sm hover:bg-admin-navy-2">Filter</button>
        {status && <Link href="/admin/engagements" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Clear</Link>}
      </form>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No engagements match.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {list.map((e) => {
            const st = String(e.status);
            return (
              <div key={String(e.id)} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-body text-sm font-semibold text-admin-text">{custName[String(e.customer_user_id)] ?? '—'}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (STATUS_PILL[st] ?? 'bg-admin-bg text-admin-text-muted')}>{st.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                    {String(e.engagement_type).replace(/_/g, ' ')} · driver {driverName(e.driver_id ? String(e.driver_id) : null)} · {fmtDate(String(e.starts_at))} · {naira(e.customer_price_total as number)}
                    {Number(e.refund_amount ?? 0) > 0 && ` · refunded ${naira(e.refund_amount as number)}`}
                  </div>
                  {Boolean(e.contract_id) && (
                    <Link href={`/admin/contracts/${String(e.contract_id)}`} className="mt-1 inline-block font-body text-[12px] font-medium text-admin-green-text hover:underline">View contract →</Link>
                  )}
                </div>
                <div className="w-full shrink-0 lg:w-72">
                  <AdminEngagementActions engagementId={String(e.id)} status={st} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between font-body text-[13px]">
          {page > 1 ? <Link href={`/admin/engagements?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page - 1) }).toString()}`} className="text-admin-text hover:text-admin-green-text">← Previous</Link> : <span />}
          <span className="text-admin-text-muted">Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/engagements?${new URLSearchParams({ ...(status ? { status } : {}), page: String(page + 1) }).toString()}`} className="text-admin-text hover:text-admin-green-text">Next →</Link> : <span />}
        </div>
      )}
    </>
  );
}
