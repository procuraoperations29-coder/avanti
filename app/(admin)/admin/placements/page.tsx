import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { PageShell } from '@/components/avanti/page-shell';
import { SectionLabel } from '@/components/avanti/section-label';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';
import { monthlySalaryForTier, formatNaira } from '@/lib/permanent/salary';
import { EnquiryStatusButtons } from './enquiry-status-buttons';

const STATUS_STYLE: Record<string, string> = {
  new: 'text-brass font-semibold',
  reviewing: 'text-brass',
  introduced: 'text-brass',
  matched: 'text-green',
  closed: 'text-ink-muted',
  declined: 'text-oxblood',
};

export default async function AdminPlacementsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const canAccess =
    user.roles.includes('admin_support') ||
    user.roles.includes('admin_verifier') ||
    user.roles.includes('super_admin');
  if (!canAccess) redirect('/admin');

  const admin = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: enquiries } = await (admin as any)
    .from('placement_enquiries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const list = enquiries ?? [];

  // Lookup customer + driver names in bulk
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

  // Also fetch placements (once matched)
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
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-8 pb-20">
        <Link
          href="/admin"
          className="mb-4 inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Admin
        </Link>

        <SectionLabel>Placements</SectionLabel>
        <h1 className="mb-10 mt-2 font-display text-4xl leading-tight text-ink md:text-5xl">
          <em className="italic">Permanent</em> placements.
        </h1>

        {/* Stats */}
        <div className="mb-10 grid gap-6 md:grid-cols-4">
          <div className={stats.new > 0 ? 'border-2 border-brass bg-brass-soft p-6' : 'border border-line bg-paper-2 p-6'}>
            <div className={stats.new > 0 ? 'font-mono text-[10px] uppercase tracking-[0.2em] text-brass' : 'font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted'}>
              New enquiries
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {stats.new}
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              In progress
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {stats.inProgress}
            </div>
          </div>
          <div className="border border-line bg-paper-2 p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
              Matched
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {stats.matched}
            </div>
          </div>
          <div className="border-2 border-green bg-green-soft p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-green">
              Active placements
            </div>
            <div className="mt-3 font-display text-4xl leading-none text-ink">
              {stats.active}
            </div>
          </div>
        </div>

        {/* Enquiries */}
        <div className="mb-16">
          <SectionLabel>Enquiries · {list.length}</SectionLabel>

          {list.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No enquiries yet.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
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
                  <div key={e.id} className="border border-line bg-paper-2 p-6">
                    <div className="mb-4 flex items-baseline justify-between gap-4">
                      <div className="flex items-baseline gap-3">
                        <span
                          className={
                            'font-mono text-[10px] uppercase tracking-wider ' +
                            (STATUS_STYLE[e.status] ?? 'text-ink-muted')
                          }
                        >
                          {e.status}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
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
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          Customer
                        </div>
                        <div className="mt-1 font-display text-lg text-ink">
                          {customerNames[e.customer_user_id] ?? '—'}
                        </div>
                        <div className="mt-2 font-mono text-xs text-ink-muted capitalize">
                          {e.contact_method}: {e.contact_detail}
                        </div>
                      </div>

                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                          Wants to hire
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <div className="font-display text-lg text-ink">
                            {driver?.name ?? '—'}
                          </div>
                          {driver && <TierBadge tier={driver.tier} label="short" />}
                        </div>
                        <div className="mt-2 font-mono text-xs text-brass">
                          {formatNaira(salary)}/month
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-line pt-4">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                        Requirements
                      </div>
                      <p className="mt-2 font-body text-sm leading-relaxed text-ink">
                        {e.requirements}
                      </p>
                      {e.preferred_start_date && (
                        <div className="mt-3 font-mono text-xs text-ink-muted">
                          Preferred start:{' '}
                          {new Date(e.preferred_start_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-line pt-4">
                      <EnquiryStatusButtons enquiryId={e.id} currentStatus={e.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Placements */}
        <div>
          <SectionLabel>Placements · {activePlacements.length}</SectionLabel>
          {activePlacements.length === 0 ? (
            <div className="mt-4 border border-line bg-paper-2 px-6 py-10 text-center font-body text-sm text-ink-muted">
              No placements yet. Once you match an enquiry and create a placement record,
              it&apos;ll show here.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full">
                <thead className="border-b border-line bg-paper-2">
                  <tr>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Start
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
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
                    <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper-2">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {new Date(p.start_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-ink">
                        {p.status}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {customerNames[p.customer_user_id] ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-ink">
                        {driverInfo[p.driver_id]?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-ink">
                        {formatNaira(Number(p.monthly_salary ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-10 border-l-2 border-brass bg-brass-soft px-6 py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brass">
            Workflow (MVP)
          </div>
          <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-ink">
            Enquiry lands → mark <span className="font-mono">reviewing</span> → contact driver
            + customer → mark <span className="font-mono">introduced</span> → confirm both parties →
            mark <span className="font-mono">matched</span> → create the placement row via SQL
            when contract is signed and salary starts.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
