import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { RaiseDispute } from './raise-dispute';

export const dynamic = 'force-dynamic';

const RESOLVED = ['resolved_by_agreement', 'resolved_by_decision', 'withdrawn'];
const SEV_PILL: Record<string, string> = {
  low: 'bg-admin-bg text-admin-text-muted', medium: 'bg-admin-amber-soft text-admin-amber-text',
  high: 'bg-red-500/12 text-red-600', critical: 'bg-red-500/20 text-red-700',
};

function fmtDate(d: string | null): string { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }

export default async function DisputesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canAct = user.roles.includes('admin_compliance') || user.roles.includes('admin_support') || user.roles.includes('super_admin');
  if (!canAct) redirect('/admin');

  const sp = await searchParams;
  const view = sp.view === 'resolved' ? 'resolved' : 'open';
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  let q = A.from('disputes').select('id, case_number, category, severity, status, summary, created_at, raised_by_user_id').order('created_at', { ascending: false }).limit(200);
  q = view === 'resolved' ? q.in('status', RESOLVED) : q.not('status', 'in', `(${RESOLVED.join(',')})`);
  const { data: rows } = await q;
  const disputes = rows ?? [];

  const ids = Array.from(new Set(disputes.map((d: { raised_by_user_id: string }) => d.raised_by_user_id)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: us } = await A.from('users').select('id, full_name').in('id', ids);
    names = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'User']));
  }

  const { count: openCount } = await A.from('disputes').select('id', { count: 'exact', head: true }).not('status', 'in', `(${RESOLVED.join(',')})`);

  // Support raises cases; build a recent-engagements picker for the intake form.
  const canRaise = user.roles.includes('admin_support') || user.roles.includes('super_admin');
  let engagementOptions: { id: string; label: string }[] = [];
  if (canRaise) {
    const { data: engs } = await A.from('engagements')
      .select('id, customer_user_id, driver_id, engagement_type, created_at')
      .order('created_at', { ascending: false }).limit(40);
    const custIds = Array.from(new Set((engs ?? []).map((e: { customer_user_id: string | null }) => e.customer_user_id).filter(Boolean)));
    const drvIds = Array.from(new Set((engs ?? []).map((e: { driver_id: string | null }) => e.driver_id).filter(Boolean)));
    const { data: custs } = custIds.length ? await A.from('users').select('id, full_name').in('id', custIds) : { data: [] };
    const custName: Record<string, string> = Object.fromEntries((custs ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Customer']));
    const { data: dps } = drvIds.length ? await A.from('driver_profiles').select('id, user_id').in('id', drvIds) : { data: [] };
    const dpUser: Record<string, string> = Object.fromEntries((dps ?? []).map((d: { id: string; user_id: string | null }) => [d.id, d.user_id]).filter((x: [string, string | null]) => x[1]));
    const drvUserIds = Object.values(dpUser);
    const { data: drvUsers } = drvUserIds.length ? await A.from('users').select('id, full_name').in('id', drvUserIds) : { data: [] };
    const drvNameByUser: Record<string, string> = Object.fromEntries((drvUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    engagementOptions = (engs ?? []).map((e: { id: string; customer_user_id: string | null; driver_id: string | null; engagement_type: string | null; created_at: string }) => {
      const c = e.customer_user_id ? custName[e.customer_user_id] ?? 'Customer' : 'Org';
      const d = e.driver_id ? drvNameByUser[dpUser[e.driver_id] ?? ''] ?? 'Driver' : '—';
      const dt = new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return { id: e.id, label: `${c} ↔ ${d} · ${(e.engagement_type ?? '').replace(/_/g, ' ')} · ${dt}` };
    });
  }

  return (
    <>
      <AdminPageHeader backHref="/admin/compliance" backLabel="Compliance" title="Disputes" subtitle="Support raises cases; Compliance resolves them" />

      {canRaise && <div className="mb-5"><RaiseDispute engagements={engagementOptions} /></div>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Open cases" value={openCount ?? 0} />
        <MiniStat label="Showing" value={`${disputes.length} ${view}`} />
      </div>

      <div className="mb-5 flex gap-2">
        <Link href="/admin/compliance/disputes?view=open" className={'rounded-xl px-4 py-2 font-body text-sm font-medium ' + (view === 'open' ? 'bg-admin-navy text-white' : 'border border-admin-border text-admin-text hover:bg-admin-bg')}>Open</Link>
        <Link href="/admin/compliance/disputes?view=resolved" className={'rounded-xl px-4 py-2 font-body text-sm font-medium ' + (view === 'resolved' ? 'bg-admin-navy text-white' : 'border border-admin-border text-admin-text hover:bg-admin-bg')}>Resolved</Link>
      </div>

      {disputes.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No {view} disputes.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {disputes.map((d: { id: string; case_number: string; category: string; severity: string; status: string; summary: string | null; created_at: string; raised_by_user_id: string }) => (
            <Link key={d.id} href={`/admin/compliance/disputes/${d.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-4 last:border-0 hover:bg-admin-bg">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-admin-text-muted">{d.case_number}</span>
                  <span className="font-body text-sm font-semibold text-admin-text">{d.category.replace(/_/g, ' ')}</span>
                  <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (SEV_PILL[d.severity] ?? 'bg-admin-bg text-admin-text-muted')}>{d.severity}</span>
                </div>
                <div className="mt-0.5 truncate font-body text-[12px] text-admin-text-muted">{d.summary ?? '—'} · by {names[d.raised_by_user_id] ?? 'User'} · {fmtDate(d.created_at)}</div>
              </div>
              <span className="inline-flex items-center rounded-full bg-admin-bg px-2.5 py-1 font-body text-[11px] font-medium text-admin-text">{d.status.replace(/_/g, ' ')}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
