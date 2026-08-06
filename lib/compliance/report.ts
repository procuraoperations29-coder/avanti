import 'server-only';

/**
 * Compliance summary metrics for a date range. Used by the on-demand reports
 * page and the monthly report cron. Every query is best-effort — a missing
 * table (e.g. sanctions before its migration) yields 0 rather than throwing.
 */
export interface ComplianceSummary {
  since: string;
  until: string;
  newUsers: number;
  engagementsCompleted: number;
  disputesOpened: number;
  disputesResolved: number;
  dataRequestsReceived: number;
  dataRequestsOverdue: number;
  sanctionsHits: number;
  sanctionsNeedsReview: number;
  auditEvents: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function count(admin: any, table: string, build: (q: any) => any): Promise<number> {
  try {
    const { count } = await build(admin.from(table).select('*', { count: 'exact', head: true }));
    return count ?? 0;
  } catch {
    return 0;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeComplianceSummary(admin: any, since: Date, until: Date): Promise<ComplianceSummary> {
  const s = since.toISOString();
  const u = until.toISOString();
  const overdueBefore = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    newUsers, engagementsCompleted, disputesOpened, disputesResolved,
    dataRequestsReceived, dataRequestsOverdue, sanctionsHits, sanctionsNeedsReview, auditEvents,
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'users', (q: any) => q.gte('created_at', s).lte('created_at', u)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'engagements', (q: any) => q.eq('status', 'completed').gte('completed_at', s).lte('completed_at', u)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'disputes', (q: any) => q.gte('created_at', s).lte('created_at', u)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'disputes', (q: any) => q.gte('resolved_at', s).lte('resolved_at', u)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'data_subject_requests', (q: any) => q.gte('created_at', s).lte('created_at', u)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'data_subject_requests', (q: any) => q.not('status', 'in', '(completed,rejected)').lt('created_at', overdueBefore)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'sanctions_checks', (q: any) => q.eq('status', 'hit')),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'sanctions_checks', (q: any) => q.eq('status', 'needs_review')),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count(admin, 'audit_logs', (q: any) => q.gte('occurred_at', s).lte('occurred_at', u)),
  ]);

  return {
    since: s, until: u,
    newUsers, engagementsCompleted, disputesOpened, disputesResolved,
    dataRequestsReceived, dataRequestsOverdue, sanctionsHits, sanctionsNeedsReview, auditEvents,
  };
}
