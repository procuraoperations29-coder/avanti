import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat } from '@/components/avanti/admin/page-header';

export const dynamic = 'force-dynamic';

const ACTIONS = ['', 'create', 'update', 'delete', 'soft_delete', 'approve', 'reject', 'publish', 'retire', 'authorize', 'capture', 'refund', 'cancel'];
const PAGE_SIZE = 50;

function fmtTime(d: string): string {
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const isSuper = user.roles.includes('super_admin');
  if (!user.roles.includes('admin_compliance') && !isSuper) redirect('/admin');

  const sp = await searchParams;
  const action = sp.action ?? '';
  const entityType = (sp.entity ?? '').trim();
  const entityId = (sp.entityId ?? '').trim();
  const actorQ = (sp.actor ?? '').trim();
  const from = sp.from ?? '';
  const to = sp.to ?? '';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const A = admin as any;

  // Resolve actor search → user ids
  let actorIds: string[] | null = null;
  if (actorQ) {
    const { data: us } = await A.from('users').select('id').or(`full_name.ilike.%${actorQ}%,email.ilike.%${actorQ}%`);
    actorIds = (us ?? []).map((u: { id: string }) => u.id);
    if (actorIds!.length === 0) actorIds = ['00000000-0000-0000-0000-000000000000'];
  }

  let query = A.from('audit_logs')
    .select('id, actor_user_id, actor_role, entity_type, entity_id, action, changes, metadata, occurred_at', { count: 'exact' })
    .order('occurred_at', { ascending: false });
  if (action) query = query.eq('action', action);
  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  if (actorIds) query = query.in('actor_user_id', actorIds);
  if (from) query = query.gte('occurred_at', new Date(from).toISOString());
  if (to) query = query.lte('occurred_at', new Date(to + 'T23:59:59').toISOString());
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: rowsData, count } = await query;
  const rows = rowsData ?? [];

  // actor names
  const ids = Array.from(new Set(rows.map((r: { actor_user_id: string | null }) => r.actor_user_id).filter(Boolean)));
  let names: Record<string, string> = {};
  if (ids.length) {
    const { data: us } = await A.from('users').select('id, full_name, email').in('id', ids);
    names = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null; email: string | null }) => [u.id, u.full_name || u.email || 'User']));
  }

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (over: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (action) base.action = action; if (entityType) base.entity = entityType; if (entityId) base.entityId = entityId;
    if (actorQ) base.actor = actorQ; if (from) base.from = from; if (to) base.to = to;
    return `/admin/audit?${new URLSearchParams({ ...base, ...over }).toString()}`;
  };

  return (
    <>
      <AdminPageHeader backHref="/admin" backLabel="Admin" title="Audit log" subtitle="Every recorded action, searchable and filterable" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Matching events" value={total} />
        <MiniStat label="Page" value={`${page} / ${pages}`} />
      </div>

      <form className="mb-5 grid gap-3 rounded-2xl border border-admin-border bg-admin-card p-4 shadow-admin-sm sm:grid-cols-3 lg:grid-cols-6">
        <label className="lg:col-span-2"><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Actor</span>
          <input name="actor" defaultValue={actorQ} placeholder="name or email" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Action</span>
          <select name="action" defaultValue={action} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green">
            {ACTIONS.map((a) => <option key={a} value={a}>{a || 'Any'}</option>)}
          </select></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Entity type</span>
          <input name="entity" defaultValue={entityType} placeholder="user, price_rule…" className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">From</span>
          <input type="date" name="from" defaultValue={from} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
        <label><span className="mb-1 block font-body text-[11px] uppercase tracking-wide text-admin-text-muted">To</span>
          <input type="date" name="to" defaultValue={to} className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm text-admin-text outline-none focus:border-admin-green" /></label>
        <div className="flex items-end gap-3 sm:col-span-3 lg:col-span-6">
          <button className="rounded-xl bg-admin-navy px-5 py-2 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2">Search</button>
          {(action || entityType || entityId || actorQ || from || to) && <Link href="/admin/audit" className="font-body text-[13px] text-admin-text-muted hover:text-admin-text">Clear</Link>}
        </div>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-12 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">No audit events match.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-admin-border shadow-admin-sm">
          <table className="w-full bg-admin-card">
            <thead className="border-b border-admin-border bg-admin-bg">
              <tr>
                {['When', 'Actor', 'Action', 'Entity', 'Details'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: { id: number; actor_user_id: string | null; actor_role: string | null; entity_type: string; entity_id: string | null; action: string; changes: unknown; metadata: unknown; occurred_at: string }) => {
                const detail = r.metadata && Object.keys(r.metadata as object).length ? r.metadata : r.changes;
                return (
                  <tr key={r.id} className="border-b border-admin-border last:border-0 align-top hover:bg-admin-bg">
                    <td className="whitespace-nowrap px-4 py-3 font-body text-[12px] text-admin-text-muted">{fmtTime(r.occurred_at)}</td>
                    <td className="px-4 py-3 font-body text-[13px] text-admin-text">{r.actor_user_id ? (names[r.actor_user_id] ?? 'User') : 'System'}{r.actor_role ? <span className="block font-body text-[11px] text-admin-text-muted">{r.actor_role}</span> : null}</td>
                    <td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-admin-bg px-2 py-0.5 font-body text-[11px] font-medium text-admin-text">{r.action}</span></td>
                    <td className="px-4 py-3 font-body text-[12px] text-admin-text">{r.entity_type}{r.entity_id ? <span className="block font-mono text-[10px] text-admin-text-muted">{r.entity_id.slice(0, 8)}</span> : null}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-admin-text-muted"><span className="line-clamp-2 max-w-[320px] break-words">{detail ? JSON.stringify(detail) : '—'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
