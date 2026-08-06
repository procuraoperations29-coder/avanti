import { redirect, notFound } from 'next/navigation';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel, AdminSpecRow } from '@/components/avanti/admin/page-header';
import { DisputeActions } from './dispute-actions';

export const dynamic = 'force-dynamic';

function fmt(d: string | null): string { return d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'; }
function naira(n: number | null): string { return n == null ? '—' : `₦${Number(n).toLocaleString('en-NG')}`; }

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!(user.roles.includes('admin_compliance') || user.roles.includes('admin_support') || user.roles.includes('super_admin'))) redirect('/admin');

  const { id } = await params;
  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  const { data: d } = await A.from('disputes').select('*').eq('id', id).single();
  if (!d) notFound();

  const uids = [d.raised_by_user_id, d.respondent_user_id].filter(Boolean);
  const { data: us } = uids.length ? await A.from('users').select('id, full_name, email').in('id', uids) : { data: [] };
  const nameOf = (uid: string | null) => (us ?? []).find((u: { id: string }) => u.id === uid)?.full_name ?? '—';

  const { data: messages } = await A.from('dispute_messages').select('id, sender_role, body, created_at').eq('dispute_id', id).order('created_at', { ascending: true });
  const { data: outcomes } = await A.from('dispute_outcomes').select('id, kind, amount, notes, created_at').eq('dispute_id', id).order('created_at', { ascending: false });

  const parties = [
    { id: d.raised_by_user_id, name: nameOf(d.raised_by_user_id), label: 'Raiser' },
    ...(d.respondent_user_id ? [{ id: d.respondent_user_id, name: nameOf(d.respondent_user_id), label: 'Respondent' }] : []),
  ];

  return (
    <>
      <AdminPageHeader backHref="/admin/compliance/disputes" backLabel="Disputes" title={`Case ${d.case_number}`} subtitle={`${d.category.replace(/_/g, ' ')} · ${d.severity} · ${d.status.replace(/_/g, ' ')}`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
            <AdminSectionLabel>Case</AdminSectionLabel>
            <div className="mt-2">
              <AdminSpecRow label="Category" value={d.category.replace(/_/g, ' ')} />
              <AdminSpecRow label="Severity" value={d.severity} />
              <AdminSpecRow label="Status" value={d.status.replace(/_/g, ' ')} />
              <AdminSpecRow label="Raised by" value={nameOf(d.raised_by_user_id)} />
              <AdminSpecRow label="Respondent" value={d.respondent_user_id ? nameOf(d.respondent_user_id) : '—'} />
              <AdminSpecRow label="Opened" value={fmt(d.created_at)} />
              <AdminSpecRow label="Resolved" value={fmt(d.resolved_at)} />
            </div>
            {d.summary && <p className="mt-3 border-t border-admin-border pt-3 font-body text-sm leading-relaxed text-admin-text">{d.summary}</p>}
            {d.resolution_summary && <p className="mt-3 rounded-xl bg-admin-green-soft px-3 py-2 font-body text-sm text-admin-green-text">Resolution: {d.resolution_summary}</p>}
          </div>

          <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
            <AdminSectionLabel>Case notes · {(messages ?? []).length}</AdminSectionLabel>
            <div className="mt-3 space-y-3">
              {(messages ?? []).length === 0 && <p className="font-body text-sm text-admin-text-muted">No notes yet.</p>}
              {(messages ?? []).map((m: { id: string; sender_role: string; body: string; created_at: string }) => (
                <div key={m.id} className="rounded-xl border border-admin-border bg-admin-bg p-3">
                  <div className="mb-1 flex items-center justify-between font-body text-[11px] text-admin-text-muted"><span className="uppercase tracking-wide">{m.sender_role}</span><span>{fmt(m.created_at)}</span></div>
                  <p className="font-body text-sm text-admin-text">{m.body}</p>
                </div>
              ))}
            </div>
          </div>

          {(outcomes ?? []).length > 0 && (
            <div className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
              <AdminSectionLabel>Outcomes</AdminSectionLabel>
              <div className="mt-2">
                {(outcomes ?? []).map((o: { id: string; kind: string; amount: number | null; notes: string | null; created_at: string }) => (
                  <div key={o.id} className="border-b border-admin-border py-2 last:border-0">
                    <div className="flex items-center justify-between"><span className="font-body text-sm font-medium text-admin-text">{o.kind.replace(/_/g, ' ')}</span><span className="font-body text-sm tabular-nums text-admin-text">{naira(o.amount)}</span></div>
                    {o.notes && <p className="mt-0.5 font-body text-[12px] text-admin-text-muted">{o.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DisputeActions disputeId={id} currentStatus={d.status} parties={parties} />
      </div>
    </>
  );
}
