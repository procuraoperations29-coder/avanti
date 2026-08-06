import { redirect } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';
import { DataRequestActions } from './data-request-actions';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  received: 'bg-admin-amber-soft text-admin-amber-text',
  in_progress: 'bg-admin-navy-soft text-white',
  completed: 'bg-admin-green-soft text-admin-green-text',
  rejected: 'bg-red-500/12 text-red-600',
};

function fmtDate(d: string | null): string { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }
function dueIn(created: string): string {
  // NDPR: respond within ~30 days.
  const due = new Date(new Date(created).getTime() + 30 * 86400000);
  const days = Math.ceil((due.getTime() - Date.now()) / 86400000);
  return days < 0 ? `${-days}d overdue` : `${days}d left`;
}

export default async function DataRequestsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_compliance') && !user.roles.includes('super_admin')) redirect('/admin');

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;
  const { data: rows } = await A.from('data_subject_requests')
    .select('id, requester_user_id, request_type, status, legal_basis, notes, created_at, completed_at')
    .order('created_at', { ascending: false }).limit(200);
  const reqs = rows ?? [];

  const ids = Array.from(new Set(reqs.map((r: { requester_user_id: string }) => r.requester_user_id)));
  let names: Record<string, { n: string; e: string | null }> = {};
  if (ids.length) {
    const { data: us } = await A.from('users').select('id, full_name, email').in('id', ids);
    names = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, { n: u.full_name ?? 'User', e: u.email }]));
  }

  const open = reqs.filter((r: { status: string }) => r.status !== 'completed' && r.status !== 'rejected').length;

  return (
    <>
      <AdminPageHeader backHref="/admin/compliance" backLabel="Compliance" title="Data requests" subtitle="NDPR / GDPR access, portability, and erasure requests" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Open requests" value={open} />
        <MiniStat label="Total" value={reqs.length} />
      </div>

      {reqs.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No data-subject requests yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
          {reqs.map((r: { id: string; requester_user_id: string; request_type: string; status: string; legal_basis: string | null; created_at: string }) => {
            const open = r.status !== 'completed' && r.status !== 'rejected';
            return (
              <div key={r.id} className="flex flex-col gap-3 border-b border-admin-border px-5 py-4 last:border-0 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-body text-sm font-semibold capitalize text-admin-text">{r.request_type.replace(/_/g, ' ')}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide ' + (STATUS_PILL[r.status] ?? 'bg-admin-bg text-admin-text-muted')}>{r.status.replace(/_/g, ' ')}</span>
                    {open && <span className="font-mono text-[11px] text-admin-text-muted">{dueIn(r.created_at)}</span>}
                  </div>
                  <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">
                    {names[r.requester_user_id]?.n ?? 'User'}{names[r.requester_user_id]?.e ? ` · ${names[r.requester_user_id]?.e}` : ''} · filed {fmtDate(r.created_at)}{r.legal_basis ? ` · ${r.legal_basis}` : ''}
                  </div>
                </div>
                <DataRequestActions id={r.id} status={r.status} requestType={r.request_type} />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
