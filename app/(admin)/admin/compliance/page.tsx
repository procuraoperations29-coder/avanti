import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';

/**
 * Compliance — audit log viewer, verification decisions, disputes.
 *
 * The audit_logs table records who did what, when, and to what. This
 * page surfaces it for admins with compliance role.
 */

export default async function AdminCompliancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_compliance') && !user.roles.includes('super_admin')) {
    redirect('/admin');
  }

  const admin = createServiceRoleClient();

  // Audit logs — most recent 100
  const { data: audits } = await admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const auditRows = audits ?? [];

  // Verification decisions — most recent 30
  const { data: decisions } = await admin
    .from('verification_decisions')
    .select('*')
    .order('decided_at', { ascending: false })
    .limit(30);

  const decisionRows = decisions ?? [];

  // Actor names
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

  // Disputes count
  const { data: disputes } = await admin
    .from('engagements')
    .select('id')
    .in('status', ['disputed', 'partially_resolved']);

  const disputeCount = disputes?.length ?? 0;

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Admin
        </Link>

        <SectionLabel>Compliance</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">The paper trail.</em>
        </h1>

        {/* Stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-3">
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Audit entries
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {auditRows.length}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Last 100 shown
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Verification decisions
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {decisionRows.length}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Last 30 shown
            </div>
          </div>
          <div
            className={
              disputeCount > 0
                ? 'border-2 border-oxblood bg-paper-2 p-6'
                : 'border border-line bg-paper-2 p-6'
            }
          >
            <div
              className={
                disputeCount > 0
                  ? 'font-mono text-[10px] uppercase tracking-[0.2em] text-oxblood'
                  : 'font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted'
              }
            >
              Active disputes
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {disputeCount}
            </div>
            <div className="mt-3 font-mono text-xs text-ink-muted">
              Engagements needing review
            </div>
          </div>
        </div>

        {/* Recent verification decisions */}
        <div className="mb-10">
          <SectionLabel>Recent verification decisions</SectionLabel>
          {decisionRows.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No verification decisions recorded yet.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      When
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Decision
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Tier
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Reviewer
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Rationale
                    </th>
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
                      <tr key={row.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                          {row.decided_at
                            ? new Date(row.decided_at).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-ink">
                            {row.decision ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-sm uppercase text-ink">
                          {row.granted_tier ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-ink">
                          {actorNames[row.reviewer_user_id ?? ''] ?? '—'}
                        </td>
                        <td className="max-w-md truncate px-4 py-3 font-body text-sm text-ink-muted">
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

        {/* Audit log */}
        <div>
          <SectionLabel>Audit log</SectionLabel>
          {auditRows.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              Audit log is empty. Any admin action or state change should appear here.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      When
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Target
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.slice(0, 50).map((a) => {
                    const row = a as {
                      id: string;
                      created_at?: string;
                      actor_user_id?: string;
                      action?: string;
                      target_type?: string;
                      target_id?: string;
                    };
                    return (
                      <tr key={row.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-ink">
                          {actorNames[row.actor_user_id ?? ''] ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-ink">
                          {row.action ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                          {row.target_type ? `${row.target_type} · ${(row.target_id ?? '').slice(0, 8)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            <ShieldAlert className="h-3 w-3" strokeWidth={2} />
            Coming
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Full audit search and filtering. Dispute resolution workflow. Data-request
            handling (GDPR/NDPR). Automated compliance reports. Sanctions re-check
            scheduling.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
