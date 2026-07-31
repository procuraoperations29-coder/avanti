import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/avanti/admin/stat-card';
import { AdminPageHeader, AdminSectionLabel } from '@/components/avanti/admin/page-header';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { monthlySalaryForTier, formatNaira } from '@/lib/permanent/salary';
import { EnquiryStatusButtons } from './enquiry-status-buttons';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-admin-amber-soft text-admin-amber-text',
  reviewing: 'bg-admin-amber-soft text-admin-amber-text',
  introduced: 'bg-admin-amber-soft text-admin-amber-text',
  matched: 'bg-admin-green-soft text-admin-green-text',
  closed: 'bg-admin-bg text-admin-text-muted',
  declined: 'bg-red-500/12 text-red-600',
};

export default async function AdminPlacementsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const canAccess =
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_verifier') ||
    user.roles.includes('super_admin');
  if (!canAccess) redirect('/admin');

  const isSuper = user.roles.includes('super_admin');
  const canVerify = user.roles.includes('admin_verifier') || isSuper;
  const canSupport = user.roles.includes('admin_support') || isSuper;
  const canFinance = user.roles.includes('admin_finance') || isSuper;
  const canCompliance = user.roles.includes('admin_compliance') || isSuper;

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: enquiries } = await (admin as any)
    .from('placement_enquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const list = enquiries ?? [];

  const customerIds = Array.from(
    new Set(list.map((e: { customer_user_id: string }) => e.customer_user_id))
  );
  const driverProfileIds = Array.from(
    new Set(list.map((e: { driver_id: string }) => e.driver_id))
  );

  let customerNames: Record<string, string> = {};
  if (customerIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (admin as any)
      .from('users')
      .select('id, full_name, phone, email')
      .in('id', customerIds);
    customerNames = Object.fromEntries(
      (users ?? []).map((u: { id: string; full_name: string | null; phone: string | null; email: string | null }) => [
        u.id,
        u.full_name ?? u.phone ?? u.email ?? 'Customer',
      ])
    );
  }

  let driverInfo: Record<string, { name: string; tier: TierLevel }> = {};
  if (driverProfileIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id, verification_tier')
      .in('id', driverProfileIds);
    const uids = (profiles ?? []).map((p: { user_id: string }) => p.user_id).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: driverUsers } = uids.length > 0
      ? await (admin as any).from('users').select('id, full_name').in('id', uids)
      : { data: [] };
    const nameById = Object.fromEntries(
      (driverUsers ?? []).map((u: { id: string; full_name: string | null }) => [
        u.id,
        u.full_name ?? 'Driver',
      ])
    );
    driverInfo = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; user_id: string; verification_tier: string }) => [
        p.id,
        {
          name: nameById[p.user_id] ?? 'Driver',
          tier: p.verification_tier as TierLevel,
        },
      ])
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: placements } = await (admin as any)
    .from('placements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const activePlacements = placements ?? [];

  const stats = {
    new: list.filter((e: { status: string }) => e.status === 'new').length,
    inProgress: list.filter((e: { status: string }) =>
      ['reviewing', 'introduced'].includes(e.status)
    ).length,
    matched: list.filter((e: { status: string }) => e.status === 'matched').length,
    active: activePlacements.filter((p: { status: string }) => p.status === 'active').length,
  };

  return (
    <>
          <AdminPageHeader
            backHref="/admin"
            backLabel="Admin"
            title="Permanent placements"
            subtitle="Long-term driver hires — from first enquiry to active placement"
          />

          <div className="mb-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <StatCard label="New enquiries" value={stats.new} tone={stats.new > 0 ? 'warning' : 'default'} />
            <StatCard label="In progress" value={stats.inProgress} />
            <StatCard label="Matched" value={stats.matched} />
            <StatCard label="Active placements" value={stats.active} tone="success" />
          </div>

          <div className="mb-10">
            <AdminSectionLabel>Enquiries · {list.length}</AdminSectionLabel>

            {list.length === 0 ? (
              <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
                No enquiries yet.
              </div>
            ) : (
              <div className="space-y-3">
                {list.map((e: {
                  id: string;
                  customer_user_id: string;
                  driver_id: string;
                  requirements: string;
                  preferred_start_date: string | null;
                  contact_method: string;
                  contact_detail: string;
                  status: string;
                  admin_notes: string | null;
                  created_at: string;
                }) => {
                  const driver = driverInfo[e.driver_id];
                  const salary = driver ? monthlySalaryForTier(driver.tier) : 0;

                  return (
                    <div key={e.id} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                      <div className="mb-4 flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3">
                          <span
                            className={
                              'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' +
                              (STATUS_STYLE[e.status] ?? 'bg-admin-bg text-admin-text-muted')
                            }
                          >
                            {e.status}
                          </span>
                          <span className="font-body text-[12px] text-admin-text-muted">
                            {new Date(e.created_at).toLocaleString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <div>
                          <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                            Customer
                          </div>
                          <div className="mt-1 font-body text-[15px] font-medium text-admin-text">
                            {customerNames[e.customer_user_id] ?? '—'}
                          </div>
                          <div className="mt-1 font-body text-[12px] capitalize text-admin-text-muted">
                            {e.contact_method}: {e.contact_detail}
                          </div>
                        </div>

                        <div>
                          <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                            Wants to hire
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <div className="font-body text-[15px] font-medium text-admin-text">
                              {driver?.name ?? '—'}
                            </div>
                            {driver && <TierBadge tier={driver.tier} label="short" />}
                          </div>
                          <div className="mt-1 font-body text-[12px] text-admin-amber-text">
                            {formatNaira(salary)}/month
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-admin-border pt-4">
                        <div className="font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                          Requirements
                        </div>
                        <p className="mt-1.5 font-body text-sm leading-relaxed text-admin-text">
                          {e.requirements}
                        </p>
                        {e.preferred_start_date && (
                          <div className="mt-2 font-body text-[12px] text-admin-text-muted">
                            Preferred start:{' '}
                            {new Date(e.preferred_start_date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 border-t border-admin-border pt-4">
                        <EnquiryStatusButtons enquiryId={e.id} currentStatus={e.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <AdminSectionLabel>Placements · {activePlacements.length}</AdminSectionLabel>
            {activePlacements.length === 0 ? (
              <div className="rounded-2xl border border-admin-border bg-admin-card px-6 py-10 text-center font-body text-sm text-admin-text-muted shadow-admin-sm">
                No placements yet. Once an enquiry is marked matched, its placement is
                created automatically and will show here.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-admin-border shadow-admin-sm">
                <table className="w-full bg-admin-card">
                  <thead className="border-b border-admin-border bg-admin-bg">
                    <tr>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                        Start
                      </th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                        Driver
                      </th>
                      <th className="px-4 py-3 text-right font-body text-[11px] uppercase tracking-wide text-admin-text-muted">
                        Monthly
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePlacements.map((p: {
                      id: string;
                      start_date: string;
                      status: string;
                      customer_user_id: string;
                      driver_id: string;
                      monthly_salary: number;
                    }) => (
                      <tr key={p.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg">
                        <td className="px-4 py-3 font-body text-[12px] text-admin-text-muted">
                          {new Date(p.start_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 font-body text-[11px] uppercase tracking-wide text-admin-text">
                          {p.status}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-admin-text">
                          {customerNames[p.customer_user_id] ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-admin-text">
                          {driverInfo[p.driver_id]?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-body text-sm font-medium tabular-nums text-admin-text">
                          {formatNaira(Number(p.monthly_salary ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-admin-border bg-admin-card px-6 py-5 shadow-admin-sm">
            <div className="font-body text-[11px] font-medium uppercase tracking-wide text-admin-text-muted">
              How this works
            </div>
            <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-admin-text">
              Enquiry lands → mark <span className="font-medium">reviewing</span> → contact driver
              and customer → mark <span className="font-medium">introduced</span> → confirm both
              parties → mark <span className="font-medium">matched</span>. The placement record —
              driver, customer, salary, start date — is created automatically the moment an
              enquiry is marked matched; no manual step needed.
            </p>
          </div>
    </>
  );
}
