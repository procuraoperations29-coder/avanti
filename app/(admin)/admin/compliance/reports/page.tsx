import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { computeComplianceSummary } from '@/lib/compliance/report';

export const dynamic = 'force-dynamic';

const RANGES: Record<string, { label: string; days: number }> = {
  '30': { label: 'Last 30 days', days: 30 },
  '90': { label: 'Last 90 days', days: 90 },
  '365': { label: 'Last 12 months', days: 365 },
};

function fmt(d: string): string { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default async function ComplianceReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  if (!user.roles.includes('admin_compliance') && !user.roles.includes('super_admin')) redirect('/admin');

  const sp = await searchParams;
  const rangeKey = RANGES[sp.range ?? '30'] ? (sp.range ?? '30') : '30';
  const days = RANGES[rangeKey]!.days;
  const until = new Date();
  const since = new Date(until.getTime() - days * 86400000);

  const admin = createServiceRoleClient();
  const s = await computeComplianceSummary(admin, since, until);

  return (
    <>
      <AdminPageHeader backHref="/admin/compliance" backLabel="Compliance" title="Compliance report" subtitle={`${fmt(s.since)} – ${fmt(s.until)}`} />

      <div className="mb-6 flex gap-2">
        {Object.entries(RANGES).map(([k, r]) => (
          <Link key={k} href={`/admin/compliance/reports?range=${k}`} className={'rounded-xl px-4 py-2 font-body text-sm font-medium ' + (k === rangeKey ? 'bg-admin-navy text-white' : 'border border-admin-border text-admin-text hover:bg-admin-bg')}>{r.label}</Link>
        ))}
      </div>

      <AdminSectionLabel>Activity</AdminSectionLabel>
      <div className="mb-6 mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New users" value={s.newUsers} subtext="Registered in period" />
        <StatCard label="Engagements completed" value={s.engagementsCompleted} subtext="In period" />
        <StatCard label="Audit events" value={s.auditEvents} subtext="Recorded actions" />
      </div>

      <AdminSectionLabel>Disputes</AdminSectionLabel>
      <div className="mb-6 mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Opened" value={s.disputesOpened} subtext="In period" />
        <StatCard label="Resolved" value={s.disputesResolved} subtext="In period" />
      </div>

      <AdminSectionLabel>Data protection &amp; screening</AdminSectionLabel>
      <div className="mb-8 mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Data requests received" value={s.dataRequestsReceived} subtext="NDPR/GDPR, in period" />
        <StatCard label="Requests overdue" value={s.dataRequestsOverdue} subtext="Open past 30 days" tone={s.dataRequestsOverdue > 0 ? 'warning' : 'default'} />
        <StatCard label="Sanctions hits" value={s.sanctionsHits} subtext="Current" tone={s.sanctionsHits > 0 ? 'warning' : 'default'} />
        <StatCard label="Re-checks due" value={s.sanctionsNeedsReview} subtext="Awaiting re-screening" tone={s.sanctionsNeedsReview > 0 ? 'warning' : 'default'} />
      </div>

      <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-5 shadow-admin-sm">
        <AdminSectionLabel>Automated delivery</AdminSectionLabel>
        <p className="mt-1 font-body text-[13px] leading-relaxed text-admin-text-muted">
          A monthly version of this report is emailed to <b className="text-admin-text">hello@avanti.com.ng</b> automatically (1st of each month). This page always shows live figures for the range you pick.
        </p>
      </div>
    </>
  );
}
