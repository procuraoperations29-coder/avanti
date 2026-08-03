import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { OvertimeActions } from './overtime-actions';

function fmtTime(s: string | null): string {
  return s ? new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const OT_PILL: Record<string, string> = {
  pending: 'bg-admin-amber-soft text-admin-amber-text',
  approved: 'bg-admin-green-soft text-admin-green-text',
  rejected: 'bg-red-500/12 text-red-600',
};

export default async function CorporateAttendancePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const orgId = user.activeOrganizationId;
  if (!orgId) redirect('/corporate');
  const isAdmin = user.roles.includes('corporate_admin');

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  // Active assignments + driver names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: asgRows } = await (admin as any)
    .from('corporate_assignments')
    .select('id, driver_id, position_title')
    .eq('organization_id', orgId)
    .eq('status', 'active');
  const assignments = asgRows ?? [];
  const driverIds = Array.from(new Set(assignments.map((a: { driver_id: string }) => a.driver_id)));
  let driverNames: Record<string, string> = {};
  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profs } = await (admin as any).from('driver_profiles').select('id, user_id').in('id', driverIds);
    const uids = (profs ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: us } = uids.length ? await (admin as any).from('users').select('id, full_name').in('id', uids) : { data: [] };
    const byUser = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
    driverNames = Object.fromEntries((profs ?? []).map((p: { id: string; user_id: string | null }) => [p.id, byUser[p.user_id ?? ''] ?? 'Driver']));
  }

  // Today's attendance
  const asgIds = assignments.map((a: { id: string }) => a.id);
  let attToday: Record<string, { sign_in_at: string | null; sign_out_at: string | null; status: string }> = {};
  if (asgIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: att } = await (admin as any)
      .from('corporate_attendance')
      .select('assignment_id, sign_in_at, sign_out_at, status')
      .in('assignment_id', asgIds)
      .eq('work_date', today);
    attToday = Object.fromEntries((att ?? []).map((a: { assignment_id: string; sign_in_at: string | null; sign_out_at: string | null; status: string }) => [a.assignment_id, a]));
  }

  // Overtime (pending first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: otRows } = await (admin as any)
    .from('corporate_overtime')
    .select('id, driver_id, work_date, hours, note, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);
  const overtime = (otRows ?? []).sort((a: { status: string }, b: { status: string }) =>
    a.status === 'pending' ? -1 : b.status === 'pending' ? 1 : 0
  );
  const pendingOt = overtime.filter((o: { status: string }) => o.status === 'pending').length;

  const presentToday = assignments.filter((a: { id: string }) => attToday[a.id]?.status === 'present').length;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-8 pb-20 sm:px-6">
      <Link
        href="/corporate"
        className="mb-6 inline-flex items-center gap-1.5 font-body text-[13px] text-admin-text-muted transition-colors hover:text-admin-text"
      >
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Dashboard
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">Attendance & overtime</h1>
        <p className="mt-1 font-body text-[13px] text-admin-text-muted">
          {presentToday} of {assignments.length} present today · {pendingOt} overtime pending
        </p>
      </div>

      {/* Today's attendance */}
      <div className="mb-10">
        <AdminSectionLabel>Today · {fmtDate(today)}</AdminSectionLabel>
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
            No active drivers yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {assignments.map((a: { id: string; driver_id: string; position_title: string | null }) => {
              const att = attToday[a.id];
              const state = att?.status === 'present' ? 'Present' : att?.sign_in_at ? 'On shift' : 'Not signed in';
              const pill = att?.status === 'present' ? 'bg-admin-green-soft text-admin-green-text' : att?.sign_in_at ? 'bg-admin-amber-soft text-admin-amber-text' : 'bg-admin-bg text-admin-text-muted';
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 border-b border-admin-border px-5 py-3.5 last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-body text-sm font-medium text-admin-text">{driverNames[a.driver_id] ?? 'Driver'}</div>
                    {a.position_title && <div className="font-body text-[12px] text-admin-text-muted">{a.position_title}</div>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right font-body text-[12px] tabular-nums text-admin-text-muted">
                      <div>In {fmtTime(att?.sign_in_at ?? null)}</div>
                      <div>Out {fmtTime(att?.sign_out_at ?? null)}</div>
                    </div>
                    <span className={'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + pill}>
                      {state}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overtime */}
      <div>
        <AdminSectionLabel>Overtime</AdminSectionLabel>
        {overtime.length === 0 ? (
          <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
            No overtime logged yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {overtime.map((o: { id: string; driver_id: string; work_date: string; hours: number; note: string | null; status: string }) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-4 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm font-medium text-admin-text">{driverNames[o.driver_id] ?? 'Driver'}</span>
                    <span className="font-body text-[13px] tabular-nums text-admin-text-muted">
                      {o.hours}h · {fmtDate(o.work_date)}
                    </span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (OT_PILL[o.status] ?? 'bg-admin-bg text-admin-text-muted')}>
                      {o.status}
                    </span>
                  </div>
                  {o.note && <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{o.note}</div>}
                </div>
                {o.status === 'pending' && isAdmin && <OvertimeActions overtimeId={o.id} />}
              </div>
            ))}
          </div>
        )}
        {!isAdmin && pendingOt > 0 && (
          <p className="mt-2 font-body text-[12px] text-admin-text-muted">Only an admin can approve overtime.</p>
        )}
      </div>
    </div>
  );
}
