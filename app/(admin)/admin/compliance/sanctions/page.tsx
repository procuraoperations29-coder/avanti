import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { RecordSanction, EnrollDriver } from './sanctions-actions';

export const dynamic = 'force-dynamic';

const PILL: Record<string, string> = {
  clear: 'bg-admin-green-soft text-admin-green-text',
  hit: 'bg-red-500/15 text-red-700',
  needs_review: 'bg-admin-amber-soft text-admin-amber-text',
  pending: 'bg-admin-bg text-admin-text-muted',
};

function fmt(d: string | null): string { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }

export default async function SanctionsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!(user.roles.includes('admin_compliance') || user.roles.includes('admin_verifier') || user.roles.includes('super_admin'))) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // Sanctions checks (table may not exist until the migration is applied).
  let checks: Array<{ id: string; user_id: string; status: string; checked_at: string | null; next_check_due: string | null; notes: string | null }> = [];
  let tableMissing = false;
  try {
    const { data, error } = await A.from('sanctions_checks').select('id, user_id, driver_id, status, checked_at, next_check_due, notes').order('next_check_due', { ascending: true, nullsFirst: false });
    if (error) tableMissing = true; else checks = data ?? [];
  } catch { tableMissing = true; }

  // Names for subjects.
  const ids = Array.from(new Set(checks.map((c) => c.user_id)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: us } = await A.from('users').select('id, full_name, email').in('id', ids);
    names = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, u.full_name || u.email || 'User']));
  }

  // Drivers not yet enrolled (for the enroll dropdown).
  let drivers: { userId: string; driverId: string; name: string }[] = [];
  if (!tableMissing) {
    const { data: dps } = await A.from('driver_profiles').select('id, user_id').not('user_id', 'is', null).limit(500);
    const enrolled = new Set(checks.map((c) => c.user_id));
    const candidates = (dps ?? []).filter((d: { user_id: string }) => !enrolled.has(d.user_id));
    const uids = candidates.map((d: { user_id: string }) => d.user_id);
    let dn: Record<string, string> = {};
    if (uids.length) {
      const { data: us } = await A.from('users').select('id, full_name').in('id', uids);
      dn = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    }
    drivers = candidates.map((d: { id: string; user_id: string }) => ({ userId: d.user_id, driverId: d.id, name: dn[d.user_id] ?? 'Driver' })).slice(0, 200);
  }

  const now = Date.now();
  const overdue = checks.filter((c) => c.status === 'needs_review' || (c.next_check_due && new Date(c.next_check_due).getTime() < now)).length;
  const hits = checks.filter((c) => c.status === 'hit').length;

  return (
    <>
      <AdminPageHeader backHref="/admin/compliance" backLabel="Compliance" title="Sanctions screening" subtitle="Watchlist screening and re-check scheduling" />

      {tableMissing ? (
        <div className="rounded-2xl border border-admin-amber-soft bg-admin-amber-soft/40 px-6 py-6 font-body text-sm text-admin-amber-text shadow-admin-sm">
          The <code>sanctions_checks</code> table isn&apos;t in the database yet. Apply migration <b>20260830000000_sanctions_checks.sql</b> (<code>npm run db:push</code> or the Supabase SQL editor), then reload.
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Screened subjects" value={checks.length} />
            <MiniStat label="Re-checks due" value={overdue} />
            <MiniStat label="Hits" value={hits} />
          </div>

          <div className="mb-6 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm">
            <EnrollDriver drivers={drivers} />
          </div>

          {checks.length === 0 ? (
            <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No subjects under screening yet — enroll a driver above.</div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
              {checks.map((c) => {
                const due = c.next_check_due && new Date(c.next_check_due).getTime() < now;
                return (
                  <div key={c.id} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm font-semibold text-admin-text">{names[c.user_id] ?? 'User'}</span>
                        <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (PILL[c.status] ?? 'bg-admin-bg text-admin-text-muted')}>{c.status.replace(/_/g, ' ')}</span>
                        {due && c.status !== 'needs_review' && <span className="font-mono text-[11px] text-red-600">overdue</span>}
                      </div>
                      <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">Last checked {fmt(c.checked_at)} · next due {fmt(c.next_check_due)}</div>
                    </div>
                    <RecordSanction userId={c.user_id} driverId={null} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
