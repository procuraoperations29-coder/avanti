import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, ArrowRight, Phone } from 'lucide-react';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { AdminSectionLabel, MiniStat } from '@/components/avanti/admin/page-header';
import { Portrait } from '@/components/avanti/portrait';
import { TierBadge, type TierLevel } from '@/components/avanti/tier-badge';

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending_verification: {
    title: 'Organisation verification pending',
    body: "A member of our team is reviewing your organisation's registration. This usually takes a business day — you'll get an email at your billing address when it's done.",
  },
  suspended: {
    title: 'Organisation account suspended',
    body: 'Contact support to resolve this before you can manage drivers.',
  },
  closed: {
    title: 'Organisation account closed',
    body: 'This account is no longer active. Contact support if you believe this is a mistake.',
  },
};

const REQUEST_STATUS: Record<string, string> = {
  new: 'bg-admin-amber-soft text-admin-amber-text',
  reviewing: 'bg-admin-amber-soft text-admin-amber-text',
  partially_fulfilled: 'bg-admin-green-soft text-admin-green-text',
  fulfilled: 'bg-admin-green-soft text-admin-green-text',
  declined: 'bg-red-500/12 text-red-600',
  closed: 'bg-admin-bg text-admin-text-muted',
};

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function CorporateHomePage() {
  const user = await getAuthUser();
  if (!user) redirect('/sign-in');

  const orgId = user.activeOrganizationId;
  if (!orgId) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">
          No organisation on your account yet.
        </h1>
        <p className="mt-3 font-body text-admin-text-muted">Contact support if you believe this is a mistake.</p>
      </div>
    );
  }

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: org } = await (admin as any)
    .from('organizations')
    .select('id, name, status')
    .eq('id', orgId)
    .single();
  if (!org) redirect('/sign-in');

  if (org.status !== 'active') {
    const copy = STATUS_COPY[org.status as string] ?? {
      title: 'Organisation status update',
      body: 'Contact support for details on your organisation account.',
    };
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 pb-20 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text md:text-4xl">
          {copy.title}
        </h1>
        <div className="mt-6 rounded-2xl border border-admin-amber/30 bg-admin-amber-soft p-5 shadow-admin-sm">
          <AdminSectionLabel>What&apos;s next</AdminSectionLabel>
          <p className="mt-1 font-body text-admin-text">{copy.body}</p>
        </div>
      </div>
    );
  }

  // Active assignments + driver bios
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignmentRows } = await (admin as any)
    .from('corporate_assignments')
    .select('id, driver_id, daily_rate, currency, position_title, start_date, status')
    .eq('organization_id', orgId)
    .eq('status', 'active')
    .order('start_date', { ascending: false });
  const assignments = assignmentRows ?? [];

  const driverIds = Array.from(new Set(assignments.map((a: { driver_id: string }) => a.driver_id)));
  let bios: Record<string, { name: string; phone: string | null; tier: TierLevel; years: number | null; classes: string[] }> = {};
  if (driverIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin as any)
      .from('driver_profiles')
      .select('id, user_id, verification_tier, years_experience, vehicle_class_experience')
      .in('id', driverIds);
    const userIds = (profiles ?? []).map((p: { user_id: string | null }) => p.user_id).filter(Boolean);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = userIds.length
      ? await (admin as any).from('users').select('id, full_name, phone').in('id', userIds)
      : { data: [] };
    const byUser = Object.fromEntries((users ?? []).map((u: { id: string; full_name: string | null; phone: string | null }) => [u.id, u]));
    bios = Object.fromEntries(
      (profiles ?? []).map((p: { id: string; user_id: string; verification_tier: string; years_experience: number | null; vehicle_class_experience: string[] | null }) => [
        p.id,
        {
          name: byUser[p.user_id]?.full_name ?? 'Driver',
          phone: byUser[p.user_id]?.phone ?? null,
          tier: (p.verification_tier as TierLevel) ?? 't1',
          years: p.years_experience,
          classes: p.vehicle_class_experience ?? [],
        },
      ])
    );
  }

  // Requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: requestRows } = await (admin as any)
    .from('corporate_driver_requests')
    .select('id, number_of_drivers, requirements, status, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10);
  const requests = requestRows ?? [];
  const openRequests = requests.filter((r: { status: string }) => ['new', 'reviewing', 'partially_fulfilled'].includes(r.status)).length;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-20 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-admin-text">{org.name}</h1>
          <p className="mt-1 font-body text-[13px] text-admin-text-muted">Your dedicated drivers</p>
        </div>
        <Link
          href="/corporate/request"
          className="inline-flex items-center gap-2 rounded-xl bg-admin-navy px-4 py-2.5 font-body text-sm font-medium text-white shadow-admin-sm transition-colors hover:bg-admin-navy-2"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Request drivers
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MiniStat label="Active drivers" value={assignments.length} />
        <MiniStat label="Open requests" value={openRequests} />
        <MiniStat label="Total requested" value={requests.reduce((s: number, r: { number_of_drivers: number }) => s + r.number_of_drivers, 0)} />
      </div>

      {/* Roster */}
      <div className="mb-10">
        <AdminSectionLabel>Your drivers</AdminSectionLabel>
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-admin-border bg-admin-card px-6 py-12 text-center shadow-admin-sm">
            <Users className="mx-auto h-8 w-8 text-admin-text-muted" strokeWidth={1.5} />
            <p className="mt-3 font-body text-sm font-medium text-admin-text">No drivers assigned yet</p>
            <p className="mt-1 font-body text-[13px] text-admin-text-muted">
              Request drivers and we&apos;ll assign vetted drivers to your account.
            </p>
            <Link
              href="/corporate/request"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-admin-navy-2 shadow-admin-sm transition-all hover:brightness-95"
            >
              Request drivers <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assignments.map((a: { id: string; driver_id: string; position_title: string | null; start_date: string }) => {
              const bio = bios[a.driver_id];
              return (
                <div key={a.id} className="rounded-2xl border border-admin-border bg-admin-card p-5 shadow-admin-sm">
                  <div className="flex items-start gap-3">
                    <Portrait initials={initialsOf(bio?.name ?? 'D')} size="md" tier={bio?.tier ?? 't1'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-lg font-semibold tracking-tight text-admin-text">
                          {bio?.name ?? 'Driver'}
                        </h3>
                        <TierBadge tier={bio?.tier ?? 't1'} size="sm" />
                      </div>
                      {a.position_title && (
                        <div className="mt-0.5 font-body text-[12px] text-admin-text-muted">{a.position_title}</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {bio?.phone && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] text-admin-text-muted">
                        <Phone className="h-3 w-3" strokeWidth={2} /> {bio.phone}
                      </span>
                    )}
                    {(bio?.years ?? 0) > 0 && (
                      <span className="rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] text-admin-text-muted">
                        <span className="font-semibold tabular-nums text-admin-text">{bio!.years}</span> yrs
                      </span>
                    )}
                    {(bio?.classes ?? []).length > 0 && (
                      <span className="rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] capitalize text-admin-text-muted">
                        {(bio!.classes).join(', ')}
                      </span>
                    )}
                    <span className="rounded-lg bg-admin-bg px-2 py-1 font-body text-[11px] text-admin-text-muted">
                      since {fmtDate(a.start_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Requests */}
      {requests.length > 0 && (
        <div>
          <AdminSectionLabel>Requests</AdminSectionLabel>
          <div className="overflow-hidden rounded-2xl border border-admin-border bg-admin-card shadow-admin-sm">
            {requests.map((r: { id: string; number_of_drivers: number; requirements: string; status: string; created_at: string }) => (
              <div key={r.id} className="flex items-center justify-between gap-4 border-b border-admin-border px-5 py-4 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-body text-sm font-medium text-admin-text">
                      {r.number_of_drivers} driver{r.number_of_drivers === 1 ? '' : 's'}
                    </span>
                    <span className={'inline-flex items-center rounded-full px-2 py-0.5 font-body text-[11px] font-medium uppercase tracking-wide ' + (REQUEST_STATUS[r.status] ?? 'bg-admin-bg text-admin-text-muted')}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate font-body text-[12px] text-admin-text-muted">{r.requirements}</div>
                </div>
                <div className="shrink-0 font-body text-[12px] tabular-nums text-admin-text-muted">{fmtDate(r.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
