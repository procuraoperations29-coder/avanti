import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getDriverSelfieUrls } from '@/lib/storage/upload';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { Portrait } from '@/components/avanti/portrait';
import type { TierLevel } from '@/components/avanti/tier-badge';
import { DriverActions } from './driver-actions';

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  approved: 'bg-admin-green-soft text-admin-green-text',
  rejected: 'bg-red-500/12 text-red-600',
  under_review: 'bg-admin-amber-soft text-admin-amber-text',
  submitted: 'bg-admin-amber-soft text-admin-amber-text',
  in_progress: 'bg-admin-bg text-admin-text-muted',
  more_info_needed: 'bg-admin-amber-soft text-admin-amber-text',
  not_started: 'bg-admin-bg text-admin-text-muted',
};
const STATUS_FILTERS = ['', 'approved', 'under_review', 'submitted', 'more_info_needed', 'in_progress', 'rejected', 'not_started'];
const TIER_FILTERS = ['', 't1', 't2', 't3', 't4'];
const PAGE_SIZE = 50;

function fmtDate(d: string | null): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
}

export default async function DriversPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canView = canVerify || user.roles.includes('admin_support');
  if (!canView) redirect('/admin');

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const status = sp.status ?? '';
  const tier = sp.tier ?? '';
  const avail = sp.avail ?? '';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // Search resolves to user ids first (name/email/phone live on users).
  let searchIds: string[] | null = null;
  if (q) {
    const { data: us } = await A.from('users').select('id').or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
    searchIds = (us ?? []).map((u: { id: string }) => u.id);
    if (searchIds!.length === 0) searchIds = ['00000000-0000-0000-0000-000000000000'];
  }

  let query = A.from('driver_profiles')
    .select('id, user_id, verification_tier, verification_status, average_rating, total_ratings, suspended, available_on_demand, available_permanent, vehicle_class_experience, created_at', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (status) query = query.eq('verification_status', status);
  if (tier) query = query.eq('verification_tier', tier);
  if (avail === 'on_demand') query = query.eq('available_on_demand', true);
  if (avail === 'permanent') query = query.eq('available_permanent', true);
  if (searchIds) query = query.in('user_id', searchIds);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: driversData, count } = await query;
  const drivers = driversData ?? [];

  const ids = drivers.map((d: { user_id: string }) => d.user_id);
  let usersById: Record<string, { full_name: string; email: string | null; phone: string | null }> = {};
  if (ids.length) {
    const { data: us } = await A.from('users').select('id, full_name, email, phone').in('id', ids);
    usersById = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string; email: string | null; phone: string | null }) => [u.id, u]));
  }

  const selfieByUser = await getDriverSelfieUrls(ids);

  // Headline counts (independent of the current filter/page).
  const { count: totalDrivers } = await A.from('driver_profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null);
  const { count: approvedDrivers } = await A.from('driver_profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('verification_status', 'approved');
  const { count: pendingDrivers } = await A.from('driver_profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).in('verification_status', ['submitted', 'under_review', 'more_info_needed']);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (q) base.q = q; if (status) base.status = status; if (tier) base.tier = tier; if (avail) base.avail = avail;
    return `/admin/drivers?${new URLSearchParams({ ...base, ...over }).toString()}`;
  };

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Drivers" subtitle="The whole driver roster — search, review, and suspend" />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="All drivers" value={totalDrivers ?? 0} />
        <MiniStat label="Approved" value={approvedDrivers ?? 0} />
        <MiniStat label="Pending review" value={pendingDrivers ?? 0} />
        <MiniStat label="Matching" value={total} />
      </div>

      {/* Filters */}
      <form className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Search name, email, phone</span>
          <input name="q" defaultValue={q} placeholder="e.g. Chidi, 0803…" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20" />
        </label>
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Verification</span>
          <select name="status" defaultValue={status} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, ' ') : 'Any'}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Tier</span>
          <select name="tier" defaultValue={tier} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {TIER_FILTERS.map((t) => <option key={t} value={t}>{t ? t.toUpperCase() : 'Any'}</option>)}
          </select>
        </label>
        <label>
          <span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Availability</span>
          <select name="avail" defaultValue={avail} className="rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            <option value="">Any</option><option value="on_demand">On-demand</option><option value="permanent">Permanent</option>
          </select>
        </label>
        <button className="rounded-xl bg-admin-navy px-5 py-2 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2">Search</button>
        {(q || status || tier || avail) && <Link href="/admin/drivers" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Clear</Link>}
      </form>

      {/* List */}
      {drivers.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No drivers match.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {drivers.map((d: { id: string; user_id: string; verification_tier: string; verification_status: string; average_rating: number | null; total_ratings: number; suspended: boolean; available_on_demand: boolean; available_permanent: boolean; vehicle_class_experience: string[] | null; created_at: string }) => {
            const u = usersById[d.user_id];
            return (
              <div key={d.id} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0">
                    <Portrait
                      initials={initialsOf(u?.full_name ?? '—')}
                      imageUrl={selfieByUser[d.user_id] ?? null}
                      imageAlt={u?.full_name ?? 'Driver'}
                      size="md"
                      tier={String(d.verification_tier) as TierLevel}
                    />
                  </div>
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-body text-sm font-semibold text-admin-text">{u?.full_name ?? '—'}</span>
                    <span className="inline-flex items-center rounded-md bg-admin-navy px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">{String(d.verification_tier).toUpperCase()}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (STATUS_PILL[d.verification_status] ?? 'bg-admin-bg text-admin-text-muted')}>{d.verification_status.replace(/_/g, ' ')}</span>
                    {d.suspended && <span className="inline-flex items-center rounded-full bg-red-500/12 px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-red-600">Suspended</span>}
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                    {u?.email ?? u?.phone ?? '—'}
                    {(d.average_rating ?? 0) > 0 && ` · ★ ${Number(d.average_rating).toFixed(2)} (${d.total_ratings})`}
                    {' · '}{[d.available_on_demand ? 'on-demand' : null, d.available_permanent ? 'permanent' : null].filter(Boolean).join(', ') || 'unavailable'}
                    {' · joined '}{fmtDate(d.created_at)}
                  </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <DriverActions driverId={d.id} suspended={d.suspended} />
                  {canVerify && (
                    <Link href={`/admin/verification/${d.id}`} className="font-body text-[12px] font-medium text-admin-green-text hover:underline">Open →</Link>
                  )}
                </div>
              </div>
            );
          })}
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
