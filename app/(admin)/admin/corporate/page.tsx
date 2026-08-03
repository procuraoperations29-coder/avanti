import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminPageHeader, MiniStat, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { CorporateActions, type DriverOption } from './corporate-actions';
import { OrgActions } from './org-actions';

const ORG_STATUS_PILL: Record<string, string> = {
  pending_verification: 'bg-admin-amber-soft text-admin-amber-text',
  active: 'bg-admin-green-soft text-admin-green-text',
  suspended: 'bg-red-500/12 text-red-600',
  closed: 'bg-admin-bg text-admin-text-muted',
};

const TIER_LABEL: Record<string, string> = { t1: 'T1', t2: 'T2', t3: 'T3', t4: 'T4' };
const STATUS_PILL: Record<string, string> = {
  new: 'bg-admin-amber-soft text-admin-amber-text',
  reviewing: 'bg-admin-amber-soft text-admin-amber-text',
  partially_fulfilled: 'bg-admin-green-soft text-admin-green-text',
  fulfilled: 'bg-admin-green-soft text-admin-green-text',
  declined: 'bg-red-500/12 text-red-600',
  closed: 'bg-admin-bg text-admin-text-muted',
};

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function AdminCorporatePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');
  const canAccess =
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_verifier') ||
    user.roles.includes('admin_finance') ||
    user.roles.includes('super_admin');
  if (!canAccess) redirect('/admin');

  const admin = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows } = await (admin as any)
    .from('corporate_driver_requests')
    .select('id, organization_id, requested_by_user_id, number_of_drivers, requirements, preferred_start_date, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  const requests = requestRows ?? [];

  // Org names
  const orgIds = Array.from(new Set(requests.map((r: { organization_id: string }) => r.organization_id)));
  let orgNames: Record<string, string> = {};
  if (orgIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: orgs } = await (admin as any).from('organizations').select('id, name').in('id', orgIds);
    orgNames = Object.fromEntries((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
  }

  // Assignments per request
  const requestIds = requests.map((r: { id: string }) => r.id);
  let assignmentsByRequest: Record<string, { name: string; position: string | null }[]> = {};
  if (requestIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: asgs } = await (admin as any)
      .from('corporate_assignments')
      .select('request_id, driver_id, position_title, status')
      .in('request_id', requestIds)
      .neq('status', 'ended');
    const asgDriverIds = Array.from(new Set((asgs ?? []).map((a: { driver_id: string }) => a.driver_id)));
    let nameByDriver: Record<string, string> = {};
    if (asgDriverIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profs } = await (admin as any).from('driver_profiles').select('id, user_id').in('id', asgDriverIds);
      const uids = (profs ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: us } = uids.length ? await (admin as any).from('users').select('id, full_name').in('id', uids) : { data: [] };
      const nameByUser = Object.fromEntries((us ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
      nameByDriver = Object.fromEntries((profs ?? []).map((p: { id: string; user_id: string | null }) => [p.id, nameByUser[p.user_id ?? ''] ?? 'Driver']));
    }
    for (const a of asgs ?? []) {
      (assignmentsByRequest[a.request_id] ??= []).push({ name: nameByDriver[a.driver_id] ?? 'Driver', position: a.position_title });
    }
  }

  // Approved drivers for the assign dropdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driverProfiles } = await (admin as any)
    .from('driver_profiles')
    .select('id, user_id, verification_tier')
    .eq('verification_status', 'approved')
    .is('deleted_at', null)
    .eq('suspended', false)
    .limit(300);
  const dUserIds = (driverProfiles ?? []).map((d: { user_id: string | null }) => d.user_id).filter(Boolean);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dUsers } = dUserIds.length ? await (admin as any).from('users').select('id, full_name').in('id', dUserIds) : { data: [] };
  const dNameByUser = Object.fromEntries((dUsers ?? []).map((u: { id: string; full_name: string | null }) => [u.id, u.full_name ?? 'Driver']));
  const drivers: DriverOption[] = (driverProfiles ?? []).map((d: { id: string; user_id: string; verification_tier: string }) => ({
    id: d.id,
    label: `${dNameByUser[d.user_id] ?? 'Driver'} · ${TIER_LABEL[d.verification_tier] ?? d.verification_tier}`,
  }));

  // Organisations (pending activation first)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgRows } = await (admin as any)
    .from('organizations')
    .select('id, name, status, billing_email, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);
  const orgs = (orgRows ?? []).sort((a: { status: string }, b: { status: string }) =>
    a.status === 'pending_verification' ? -1 : b.status === 'pending_verification' ? 1 : 0
  );
  const pendingOrgs = orgs.filter((o: { status: string }) => o.status === 'pending_verification').length;

  const counts = {
    new: requests.filter((r: { status: string }) => r.status === 'new').length,
    open: requests.filter((r: { status: string }) => ['new', 'reviewing', 'partially_fulfilled'].includes(r.status)).length,
    fulfilled: requests.filter((r: { status: string }) => r.status === 'fulfilled').length,
  };

  return (
    <>
      <AdminPageHeader
        backHref="/admin"
        backLabel="Admin"
        title="Corporate staffing"
        subtitle="Organisation driver requests — assign vetted drivers and set rates"
        actions={
          <Link
            href="/admin/corporate/oversight"
            className="inline-flex items-center rounded-xl border border-admin-border bg-admin-card px-4 py-2 font-body text-sm font-medium text-admin-text shadow-admin-sm transition-colors hover:bg-admin-bg"
          >
            Finance & payouts
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Pending orgs" value={pendingOrgs} />
        <MiniStat label="New requests" value={counts.new} />
        <MiniStat label="Open requests" value={counts.open} />
        <MiniStat label="Fulfilled" value={counts.fulfilled} />
      </div>

      {/* Organisations */}
      {orgs.length > 0 && (
        <div className="mb-10">
          <AdminSectionLabel>Organisations</AdminSectionLabel>
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {orgs.map((o: { id: string; name: string; status: string; billing_email: string | null }) => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-3.5 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body text-sm font-medium text-admin-text">{o.name}</span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (ORG_STATUS_PILL[o.status] ?? 'bg-admin-bg text-admin-text-muted')}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {o.billing_email && <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{o.billing_email}</div>}
                </div>
                <OrgActions orgId={o.id} status={o.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
          No corporate requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(
            (r: {
              id: string;
              organization_id: string;
              number_of_drivers: number;
              requirements: string;
              preferred_start_date: string | null;
              status: string;
              created_at: string;
            }) => {
              const assigned = assignmentsByRequest[r.id] ?? [];
              return (
                <div key={r.id} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-semibold tracking-tight text-admin-text">
                        {orgNames[r.organization_id] ?? 'Organisation'}
                      </span>
                      <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (STATUS_PILL[r.status] ?? 'bg-admin-bg text-admin-text-muted')}>
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="font-body text-[12px] text-admin-text-muted">{fmtDate(r.created_at)}</span>
                  </div>

                  <div className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
                    <Detail label="Drivers requested" value={String(r.number_of_drivers)} />
                    <Detail label="Assigned" value={`${assigned.length} of ${r.number_of_drivers}`} />
                    <Detail label="Preferred start" value={r.preferred_start_date ? new Date(r.preferred_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
                  </div>

                  <div className="mt-3">
                    <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">Requirements</div>
                    <p className="mt-0.5 font-body text-sm leading-relaxed text-admin-text">{r.requirements}</p>
                  </div>

                  {assigned.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {assigned.map((a, i) => (
                        <span key={i} className="rounded-lg bg-admin-green-soft px-2 py-1 font-body text-[11px] font-medium text-admin-green-text">
                          {a.name}
                          {a.position ? ` · ${a.position}` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 border-t border-admin-border pt-4">
                    <CorporateActions requestId={r.id} status={r.status} drivers={drivers} defaultStartDate={r.preferred_start_date ?? today} />
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">{label}</div>
      <div className="mt-0.5 font-body text-sm tabular-nums text-admin-text">{value}</div>
    </div>
  );
}
