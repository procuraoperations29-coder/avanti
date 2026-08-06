import 'server-only';

export type AlertSeverity = 'high' | 'medium' | 'info';
export interface Anomaly {
  severity: AlertSeverity;
  title: string;
  detail: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cnt(admin: any, table: string, build: (q: any) => any): Promise<number> {
  try {
    const { count } = await build(admin.from(table).select('*', { count: 'exact', head: true }));
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Point-in-time anomaly checks across growth, disputes, payments, and
 * compliance. Best-effort (a missing table yields 0). Returned most-severe
 * first. Shared by the analytics page and the daily alert cron.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function detectAnomalies(admin: any): Promise<Anomaly[]> {
  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d14 = new Date(now - 14 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();
  const out: Anomaly[] = [];

  // Signups: last 7d vs the 7d before that.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sNow = await cnt(admin, 'users', (q: any) => q.gte('created_at', d7));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sPrev = await cnt(admin, 'users', (q: any) => q.gte('created_at', d14).lt('created_at', d7));
  if (sPrev >= 4 && sNow < sPrev * 0.5) {
    out.push({ severity: 'medium', title: 'Signups dropped', detail: `${sNow} new users in the last 7 days vs ${sPrev} the week before (down ${Math.round((1 - sNow / sPrev) * 100)}%).` });
  } else if (sNow >= 8 && sNow > sPrev * 2) {
    out.push({ severity: 'info', title: 'Signups surged', detail: `${sNow} new users in the last 7 days vs ${sPrev} the week before.` });
  }

  // Disputes opened this week vs last.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dNow = await cnt(admin, 'disputes', (q: any) => q.gte('created_at', d7));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dPrev = await cnt(admin, 'disputes', (q: any) => q.gte('created_at', d14).lt('created_at', d7));
  if (dNow >= 3 && dNow > dPrev * 2) {
    out.push({ severity: 'medium', title: 'Dispute spike', detail: `${dNow} disputes opened in the last 7 days vs ${dPrev} the week before.` });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const critical = await cnt(admin, 'disputes', (q: any) => q.eq('severity', 'critical').not('status', 'in', '(resolved_by_agreement,resolved_by_decision,withdrawn)'));
  if (critical > 0) out.push({ severity: 'high', title: 'Critical disputes open', detail: `${critical} critical dispute${critical === 1 ? '' : 's'} awaiting resolution.` });

  // Failed payments last 7d.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const failed = await cnt(admin, 'payments', (q: any) => q.eq('status', 'failed').gte('created_at', d7));
  if (failed > 0) out.push({ severity: 'medium', title: 'Failed payments', detail: `${failed} payment${failed === 1 ? '' : 's'} failed in the last 7 days.` });

  // NDPR/GDPR requests overdue (open > 30 days).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dsrOverdue = await cnt(admin, 'data_subject_requests', (q: any) => q.not('status', 'in', '(completed,rejected)').lt('created_at', d30));
  if (dsrOverdue > 0) out.push({ severity: 'high', title: 'Data requests overdue', detail: `${dsrOverdue} NDPR/GDPR request${dsrOverdue === 1 ? '' : 's'} open past the 30-day deadline.` });

  // Sanctions re-checks due.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanctions = await cnt(admin, 'sanctions_checks', (q: any) => q.eq('status', 'needs_review'));
  if (sanctions > 0) out.push({ severity: 'high', title: 'Sanctions re-checks due', detail: `${sanctions} screened subject${sanctions === 1 ? '' : 's'} need re-screening.` });

  const order: Record<AlertSeverity, number> = { high: 0, medium: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
