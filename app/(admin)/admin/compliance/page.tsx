import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { AdminSidebar } from '@/components/avanti/admin/admin-sidebar';
import { StatCard } from '@/components/avanti/admin/stat-card';

/**
 * Compliance — audit log viewer, verification decisions, disputes.
 *
 * The audit_logs table records who did what, when, and to what.
 * NOTE: this used to read `target_type`/`target_id`, which aren't real
 * columns on audit_logs (the actual columns are `entity_type`/
 * `entity_id`) — so the "Target" column always rendered "—". Fixed here.
 */

export default async function AdminCompliancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_compliance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;

  const admin = createServiceRoleClient();

  const { data: audits } = await admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const auditRows = audits ?? [];

  const { data: decisions } = await admin
    .from('verification_decisions')
    .select('*')
    .order('decided_at', { ascending: false })
    .limit(30);

  const decisionRows = decisions ?? [];

  const actorIds = Array.from(
    new Set([
      ...auditRows.map((a) => (a as { actor_user_id?: string }).actor_user_id).filter(Boolean),
      ...decisionRows.map((d) => (d as { reviewer_user_id?: string }).reviewer_user_id).filter(Boolean),
    ])
  ) as string[];

  let actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from('users')
      .select('id, full_name')
      .in('id', actorIds);
    actorNames = Object.fromEntries(
      (actors ?? []).map((a) => [a.id, a.full_name ?? 'Admin'])
    );
  }

  const { data: disputes } = await admin
    .from('engagements')
    .select('id')
    .in('status', ['disputed', 'partially_resolved']);

  const disputeCount = disputes?.length ?? 0;

  return (
    <PageShell>
      <div className="flex bg-admin-bg" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <AdminSidebar
          active="compliance"
          canVerify={canVerify}
          canPlacements={canSupport || canVerify}
          canSupport={canSupport}
          canFinance={canFinance}
          canCompliance={true}
          isSuper={isSuper}
        />

        <div className="min-w-0 flex-1 px-6 py-6 sm:px-8">
          <Link
            href="/admin"
            className="mb-4 inline-block font-body text-[13px] text-admin-text-muted hover:text-admin-text"
          >
            ← Admin
          </Link>
          <p className="mb-6 font-body text-lg font-medium text-admin-text">
            Compliance
          </p>

          <div className="mb-8 grid gap-3 md:grid-cols-3">
            <StatCard label="Audit entries" value={auditRows.length} subtext="Last 100 shown" />
            <StatCard label="Verification decisions" value={decisionRows.length} subtext="Last 30 shown" />
            <StatCard
              label="Active disputes"
              value={disputeCount}
              subtext="Engagements needing review"
              tone={disputeCount > 0 ? 'warning' : 'default'}
            />
          </div>

          <div className="mb-10">
            <p className="mb-3 font-body text-[13px] font-medium text-admin-text">
              Recent verification decisions
            </p>
            {decisionRows.length === 0 ? (
              <div className="rounded-xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted">
                No verification decisions recorded yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-admin-border">
                <table className="w-full bg-admin-card">
                  <thead className="border-b border-admin-border bg-admin-bg">
                    <tr>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">When</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Decision</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Tier</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Reviewer</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisionRows.map((d) => {
                      const row = d as {
                        id: string;
                        decided_at?: string;
                        decision?: string;
                        granted_tier?: string;
                        reviewer_user_id?: string;
                        rationale?: string;
                      };
                      return (
                        <tr key={row.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                          <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                            {row.decided_at
                              ? new Date(row.decided_at).toLocaleString('en-GB', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-[11px] uppercase tracking-wide text-admin-text">
                            {row.decision ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-sm uppercase text-admin-text">
                            {row.granted_tier ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-admin-text">
                            {actorNames[row.reviewer_user_id ?? ''] ?? '—'}
                          </td>
                          <td className="max-w-md truncate px-4 py-3 font-body text-sm text-admin-text-muted">
                            {row.rationale ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 font-body text-[13px] font-medium text-admin-text">Audit log</p>
            {auditRows.length === 0 ? (
              <div className="rounded-xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted">
                Audit log is empty. Any admin action or state change should appear here.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-admin-border">
                <table className="w-full bg-admin-card">
                  <thead className="border-b border-admin-border bg-admin-bg">
                    <tr>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">When</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Actor</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Action</th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.slice(0, 50).map((a) => {
                      const row = a as {
                        id: string;
                        created_at?: string;
                        actor_user_id?: string;
                        action?: string;
                        entity_type?: string;
                        entity_id?: string;
                      };
                      return (
                        <tr key={row.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                          <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString('en-GB', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-sm text-admin-text">
                            {actorNames[row.actor_user_id ?? ''] ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-[11px] uppercase tracking-wide text-admin-text">
                            {row.action ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                            {row.entity_type ? `${row.entity_type} · ${(row.entity_id ?? '').slice(0, 8)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-admin-border bg-admin-card px-6 py-5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-admin-text-muted" strokeWidth={1.75} />
            <div>
              <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
                Coming
              </div>
              <p className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
                Full audit search and filtering. Dispute resolution workflow. Data-request
                handling (GDPR/NDPR). Automated compliance reports. Sanctions re-check
                scheduling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
